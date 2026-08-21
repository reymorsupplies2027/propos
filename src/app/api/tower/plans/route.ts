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

// ── GET /api/tower/plans ───────────────────────────────────────────────
// List all plans with subscriber count
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const plans = await db.plan.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    // Enrich with active subscriber count
    const plansWithCounts = await Promise.all(
      plans.map(async (plan) => {
        const activeSubscribers = await db.subscription.count({
          where: { planId: plan.id, status: 'active' },
        });

        return {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          maxProperties: plan.maxProperties,
          maxClients: plan.maxClients,
          features: JSON.parse(plan.features),
          isActive: plan.isActive,
          totalSubscriptions: plan._count.subscriptions,
          activeSubscribers: activeSubscribers,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        };
      })
    );

    return NextResponse.json({ plans: plansWithCounts });
  } catch (error) {
    console.error('Error listing plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── POST /api/tower/plans ──────────────────────────────────────────────
// Create new plan
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { name, slug, price, currency, interval, maxProperties, maxClients, features } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'The fields "name" and "slug" are required' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.plan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A plan with this slug already exists' },
        { status: 409 }
      );
    }

    const plan = await db.plan.create({
      data: {
        name,
        slug,
        price: price ?? 0,
        currency: currency ?? 'TTD',
        interval: interval ?? 'monthly',
        maxProperties: maxProperties ?? 10,
        maxClients: maxClients ?? 50,
        features: features ? JSON.stringify(features) : '[]',
      },
    });

    return NextResponse.json(
      { message: 'Plan created successfully', plan },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
