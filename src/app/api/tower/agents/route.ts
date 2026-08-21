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

// ── GET: List all agents with enriched data ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim() || '';

    // Build where clause
    const where: Prisma.AgentWhereInput = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { displayName: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const agents = await db.agent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          take: 1,
          orderBy: { startsAt: 'desc' },
        },
        _count: {
          select: {
            properties: true,
            clients: true,
            deals: true,
            visitorEvents: true,
          },
        },
      },
    });

    // Enrich with visitor stats
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const [visitors7d, visitors30d] = await Promise.all([
          db.visitorEvent.count({
            where: { agentId: agent.id, createdAt: { gte: sevenDaysAgo } },
          }),
          db.visitorEvent.count({
            where: { agentId: agent.id, createdAt: { gte: thirtyDaysAgo } },
          }),
        ]);

        const currentSubscription = agent.subscriptions[0] || null;

        return {
          id: agent.id,
          userId: agent.userId,
          slug: agent.slug,
          businessName: agent.businessName,
          displayName: agent.displayName,
          phone: agent.phone,
          email: agent.email,
          logo: agent.logo,
          primaryColor: agent.primaryColor,
          accentColor: agent.accentColor,
          tagline: agent.tagline,
          city: agent.city,
          country: agent.country,
          status: agent.status,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          // Counts
          propertyCount: agent._count.properties,
          clientCount: agent._count.clients,
          dealCount: agent._count.deals,
          totalVisitorEvents: agent._count.visitorEvents,
          visitorsLast7Days: visitors7d,
          visitorsLast30Days: visitors30d,
          // Subscription
          subscription: currentSubscription
            ? {
                id: currentSubscription.id,
                status: currentSubscription.status,
                startsAt: currentSubscription.startsAt,
                endsAt: currentSubscription.endsAt,
                plan: {
                  id: currentSubscription.plan.id,
                  name: currentSubscription.plan.name,
                  slug: currentSubscription.plan.slug,
                  price: currentSubscription.plan.price,
                  currency: currentSubscription.plan.currency,
                  interval: currentSubscription.plan.interval,
                },
              }
            : null,
        };
      })
    );

    // Aggregated counts
    const allAgents = await db.agent.findMany({ select: { status: true } });
    const totalAgents = allAgents.length;
    const activeAgents = allAgents.filter((a) => a.status === 'active').length;
    const suspendedAgents = allAgents.filter((a) => a.status === 'suspended').length;

    return NextResponse.json({
      agents: agentsWithStats,
      pagination: {
        total: agentsWithStats.length,
      },
      aggregates: {
        totalAgents,
        activeAgents,
        suspendedAgents,
      },
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
