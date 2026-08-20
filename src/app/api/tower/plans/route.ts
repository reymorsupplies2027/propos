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
          nombre: plan.name,
          slug: plan.slug,
          precio: plan.price,
          moneda: plan.currency,
          intervalo: plan.interval,
          maxPropiedades: plan.maxProperties,
          maxClientes: plan.maxClients,
          caracteristicas: JSON.parse(plan.features),
          activo: plan.isActive,
          totalSuscripciones: plan._count.subscriptions,
          suscriptoresActivos: activeSubscribers,
          creadoEn: plan.createdAt,
          actualizadoEn: plan.updatedAt,
        };
      })
    );

    return NextResponse.json({ planes: plansWithCounts });
  } catch (error) {
    console.error('Error al listar planes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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
        { error: 'Los campos "nombre" y "slug" son obligatorios' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.plan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un plan con ese slug' },
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
      { mensaje: 'Plan creado correctamente', plan },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
