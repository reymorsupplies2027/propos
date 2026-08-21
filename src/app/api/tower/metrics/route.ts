import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ── Auth guard ──────────────────────────────────────────────────────────
async function requirePlatformOwner(request: NextRequest) {
  const token = request.cookies.get('propos-token')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }), user: null };
  }

  const { role } = payload as { role: string };
  if (role !== 'platform_owner') {
    return { error: NextResponse.json({ error: 'Access denied. Only the platform owner can access this resource.' }, { status: 403 }), user: null };
  }

  return { error: null, user: payload };
}

// ── GET /api/tower/metrics ─────────────────────────────────────────────
// Platform-wide dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Agents ──────────────────────────────────────────────────────
    const agentStats = await db.agent.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const agentCounts: Record<string, number> = {};
    for (const s of agentStats) {
      agentCounts[s.status] = s._count.id;
    }
    const totalAgents = agentStats.reduce((sum, s) => sum + s._count.id, 0);

    // ── 2. Properties by status ────────────────────────────────────────
    const propertyStats = await db.property.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const propertyCounts: Record<string, number> = {};
    for (const p of propertyStats) {
      propertyCounts[p.status] = p._count.id;
    }
    const totalProperties = propertyStats.reduce((sum, p) => sum + p._count.id, 0);

    // ── 3. Total clients ───────────────────────────────────────────────
    const totalClients = await db.client.count();

    // ── 4. Deals by status ─────────────────────────────────────────────
    const dealStats = await db.deal.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const dealCounts: Record<string, number> = {};
    for (const d of dealStats) {
      dealCounts[d.status] = d._count.id;
    }
    const totalDeals = dealStats.reduce((sum, d) => sum + d._count.id, 0);

    // ── 5. Revenue from active subscriptions ───────────────────────────
    const activeSubscriptions = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });

    let totalMonthlyRevenue = 0;
    const revenueBreakdown: { planId: string; planName: string; subscriberCount: number; unitPrice: number; currency: string; total: number }[] = [];

    // Group by plan for breakdown
    const planRevenueMap: Record<string, { count: number; plan: (typeof activeSubscriptions)[number]['plan'] }> = {};
    for (const sub of activeSubscriptions) {
      const key = sub.planId;
      if (!planRevenueMap[key]) {
        planRevenueMap[key] = { count: 0, plan: sub.plan };
      }
      planRevenueMap[key].count++;

      const monthlyEquiv = sub.plan.interval === 'yearly'
        ? sub.plan.price / 12
        : sub.plan.price;
      totalMonthlyRevenue += monthlyEquiv;
    }

    for (const [planId, data] of Object.entries(planRevenueMap)) {
      const monthlyEquiv = data.plan.interval === 'yearly'
        ? data.plan.price / 12
        : data.plan.price;
      revenueBreakdown.push({
        planId,
        planName: data.plan.name,
        subscriberCount: data.count,
        unitPrice: data.plan.price,
        currency: data.plan.currency,
        total: Math.round(monthlyEquiv * data.count * 100) / 100,
      });
    }

    // ── 6. Visitor events ─────────────────────────────────────────────
    const [visitors7d, visitors30d] = await Promise.all([
      db.visitorEvent.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      db.visitorEvent.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // ── 7. Top performing agents (by deals closed) ────────────────────
    const topAgentsByDeals = await db.agent.findMany({
      where: { status: 'active' },
      take: 5,
      orderBy: {
        deals: { _count: 'desc' },
      },
      select: {
        id: true,
        businessName: true,
        displayName: true,
        slug: true,
        city: true,
        status: true,
        _count: {
          select: { deals: true },
        },
      },
    });

    // ── 8. Top agents by visitor traffic (last 30 days) ──────────────
    // Get agent IDs with most visitor events in last 30 days
    const visitorAgg = await db.visitorEvent.groupBy({
      by: ['agentId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topAgentIds = visitorAgg.map((v) => v.agentId);
    const topAgentsByVisitors = topAgentIds.length > 0
      ? await db.agent.findMany({
          where: { id: { in: topAgentIds } },
          select: {
            id: true,
            businessName: true,
            displayName: true,
            slug: true,
            city: true,
            status: true,
          },
        }).then((agents) => {
          const agentMap = new Map(agents.map((a) => [a.id, a]));
          return visitorAgg.map((v) => ({
            ...agentMap.get(v.agentId)!,
            visitorCount30d: v._count.id,
          }));
        })
      : [];

    // ── 9. Recent activity feed (last 20 events) ─────────────────────
    // We'll gather the most recent events from various tables
    const recentDeals = await db.deal.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, businessName: true, displayName: true } },
        property: { select: { id: true, title: true, slug: true } },
      },
    });

    const recentProperties = await db.property.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, businessName: true, displayName: true } },
      },
    });

    const recentClients = await db.client.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, businessName: true, displayName: true } },
      },
    });

    // Merge and sort by time
    type FeedItem = {
      id: string;
      type: string;
      description: string;
      agent: { id: string; businessName: string; displayName: string } | null;
      date: Date;
      metadata?: Record<string, unknown>;
    };

    const feed: FeedItem[] = [];

    for (const deal of recentDeals) {
      feed.push({
        id: deal.id,
        type: 'deal',
        description: `New deal: ${deal.dealType === 'sale' ? 'sale' : 'rental'} — ${deal.currency} ${deal.totalPrice ?? 0}`,
        agent: deal.agent,
        date: deal.createdAt,
        metadata: { dealStatus: deal.status, propertyTitle: deal.property?.title ?? null },
      });
    }

    for (const prop of recentProperties) {
      feed.push({
        id: prop.id,
        type: 'property',
        description: `New property: ${prop.title}`,
        agent: prop.agent,
        date: prop.createdAt,
        metadata: { propertyType: prop.propertyType, listingType: prop.listingType, status: prop.status },
      });
    }

    for (const client of recentClients) {
      feed.push({
        id: client.id,
        type: 'client',
        description: `New client: ${client.firstName} ${client.lastName}`,
        agent: client.agent,
        date: client.createdAt,
        metadata: { source: client.source, clientStatus: client.status },
      });
    }

    // Sort by date descending and take top 20
    feed.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivity = feed.slice(0, 20);

    return NextResponse.json({
      agents: {
        total: totalAgents,
        active: agentCounts['active'] ?? 0,
        suspended: agentCounts['suspended'] ?? 0,
        byStatus: agentCounts,
      },
      properties: {
        total: totalProperties,
        available: propertyCounts['available'] ?? 0,
        pending: propertyCounts['pending'] ?? 0,
        sold: propertyCounts['sold'] ?? 0,
        rented: propertyCounts['rented'] ?? 0,
        byStatus: propertyCounts,
      },
      clients: {
        total: totalClients,
      },
      deals: {
        total: totalDeals,
        byStatus: dealCounts,
      },
      revenue: {
        estimatedMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
        activeSubscriptions: activeSubscriptions.length,
        breakdownByPlan: revenueBreakdown,
      },
      visitors: {
        last7Days: visitors7d,
        last30Days: visitors30d,
      },
      topAgents: {
        byDealsClosed: topAgentsByDeals.map((a) => ({
          id: a.id,
          businessName: a.businessName,
          displayName: a.displayName,
          slug: a.slug,
          city: a.city,
          totalDeals: a._count.deals,
        })),
        byVisitorTraffic: topAgentsByVisitors,
      },
      recentActivity: recentActivity,
    });
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
