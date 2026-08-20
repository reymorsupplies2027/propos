import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// ── Auth guard ──────────────────────────────────────────────────────────
async function requirePlatformOwner(request: NextRequest) {
  const token = request.cookies.get('propos-token')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }), user: null };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 }), user: null };
  }

  const { role } = payload as { role: string };
  if (role !== 'platform_owner') {
    return { error: NextResponse.json({ error: 'Acceso denegado. Solo el propietario de la plataforma puede acceder.' }, { status: 403 }), user: null };
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
      tipo: string;
      descripcion: string;
      agente: { id: string; businessName: string; displayName: string } | null;
      fecha: Date;
      metadatos?: Record<string, unknown>;
    };

    const feed: FeedItem[] = [];

    for (const deal of recentDeals) {
      feed.push({
        id: deal.id,
        tipo: 'trato',
        descripcion: `Nuevo trato: ${deal.dealType === 'sale' ? 'venta' : 'alquiler'} — ${deal.currency} ${deal.totalPrice ?? 0}`,
        agente: deal.agent,
        fecha: deal.createdAt,
        metadatos: { dealStatus: deal.status, propertyTitle: deal.property?.title ?? null },
      });
    }

    for (const prop of recentProperties) {
      feed.push({
        id: prop.id,
        tipo: 'propiedad',
        descripcion: `Nueva propiedad: ${prop.title}`,
        agente: prop.agent,
        fecha: prop.createdAt,
        metadatos: { propertyType: prop.propertyType, listingType: prop.listingType, status: prop.status },
      });
    }

    for (const client of recentClients) {
      feed.push({
        id: client.id,
        tipo: 'cliente',
        descripcion: `Nuevo cliente: ${client.firstName} ${client.lastName}`,
        agente: client.agent,
        fecha: client.createdAt,
        metadatos: { source: client.source, clientStatus: client.status },
      });
    }

    // Sort by date descending and take top 20
    feed.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const recentActivity = feed.slice(0, 20);

    return NextResponse.json({
      agentes: {
        total: totalAgents,
        activos: agentCounts['active'] ?? 0,
        suspendidos: agentCounts['suspended'] ?? 0,
        porEstado: agentCounts,
      },
      propiedades: {
        total: totalProperties,
        disponibles: propertyCounts['available'] ?? 0,
        pendientes: propertyCounts['pending'] ?? 0,
        vendidas: propertyCounts['sold'] ?? 0,
        alquiladas: propertyCounts['rented'] ?? 0,
        porEstado: propertyCounts,
      },
      clientes: {
        total: totalClients,
      },
      tratos: {
        total: totalDeals,
        porEstado: dealCounts,
      },
      ingresos: {
        ingresoMensualEstimado: Math.round(totalMonthlyRevenue * 100) / 100,
        suscripcionesActivas: activeSubscriptions.length,
        desglosePorPlan: revenueBreakdown,
      },
      visitantes: {
        ultimos7Dias: visitors7d,
        ultimos30Dias: visitors30d,
      },
      mejoresAgentes: {
        porTratosCerrados: topAgentsByDeals.map((a) => ({
          id: a.id,
          nombreComercial: a.businessName,
          nombreMostrado: a.displayName,
          slug: a.slug,
          ciudad: a.city,
          totalTratos: a._count.deals,
        })),
        porTraficoVisitantes: topAgentsByVisitors,
      },
      actividadReciente: recentActivity,
    });
  } catch (error) {
    console.error('Error al obtener métricas de la plataforma:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
