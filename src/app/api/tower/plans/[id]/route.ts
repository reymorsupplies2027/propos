import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

// ── PATCH /api/tower/plans/:id ─────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const plan = await db.plan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, price, currency, interval, maxProperties, maxClients, features } = body;

    // Check slug uniqueness if changing
    if (slug && slug !== plan.slug) {
      const existing = await db.plan.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe un plan con ese slug' },
          { status: 409 }
        );
      }
    }

    const updatedPlan = await db.plan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(price !== undefined && { price }),
        ...(currency !== undefined && { currency }),
        ...(interval !== undefined && { interval }),
        ...(maxProperties !== undefined && { maxProperties }),
        ...(maxClients !== undefined && { maxClients }),
        ...(features !== undefined && { features: JSON.stringify(features) }),
      },
    });

    return NextResponse.json({
      mensaje: 'Plan actualizado correctamente',
      plan: updatedPlan,
    });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/tower/plans/:id ────────────────────────────────────────
// Deactivate plan (set isActive false) if no active subscriptions use it
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        subscriptions: { where: { status: 'active' } },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { error: 'El plan ya está desactivado' },
        { status: 400 }
      );
    }

    if (plan.subscriptions.length > 0) {
      return NextResponse.json(
        { error: 'No se puede desactivar el plan porque tiene suscripciones activas. Cancela las suscripciones primero o reasigna los agentes a otro plan.' },
        { status: 400 }
      );
    }

    const deactivatedPlan = await db.plan.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      mensaje: 'Plan desactivado correctamente',
      plan: deactivatedPlan,
    });
  } catch (error) {
    console.error('Error al desactivar plan:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
