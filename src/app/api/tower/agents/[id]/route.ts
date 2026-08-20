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

// ── PATCH /api/tower/agents/:id ─────────────────────────────────────────
// Update agent status, plan assignment, branding
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { status, planId, primaryColor, accentColor, businessName, displayName, tagline, bio } = body;

    // Build update data
    const updateData: Prisma.AgentUpdateInput = {};

    if (status !== undefined) {
      const allowedStatuses = ['active', 'suspended'];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Estado no válido. Valores permitidos: ${allowedStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (tagline !== undefined) updateData.tagline = tagline;
    if (bio !== undefined) updateData.bio = bio;

    // Handle plan assignment change
    let subscriptionResult = null;
    if (planId !== undefined && planId !== null) {
      const plan = await db.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
      }
      if (!plan.isActive) {
        return NextResponse.json({ error: 'El plan seleccionado no está activo' }, { status: 400 });
      }

      // Deactivate current active subscriptions
      await db.subscription.updateMany({
        where: { agentId: id, status: 'active' },
        data: { status: 'cancelled', endsAt: new Date() },
      });

      // Create new subscription
      const now = new Date();
      let endsAt: Date | null = null;
      if (plan.interval === 'monthly') {
        endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (plan.interval === 'yearly') {
        endsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      }

      subscriptionResult = await db.subscription.create({
        data: {
          agentId: id,
          planId,
          status: 'active',
          startsAt: now,
          endsAt,
        },
        include: { plan: true },
      });
    }

    // Apply agent updates
    const updatedAgent = await db.agent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      mensaje: 'Agente actualizado correctamente',
      agente: updatedAgent,
      nuevaSuscripcion: subscriptionResult,
    });
  } catch (error) {
    console.error('Error al actualizar agente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/tower/agents/:id ────────────────────────────────────────
// Soft-delete: set status to 'suspended'
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformOwner(request);
    if (auth.error) return auth.error;

    const { id } = await params;

    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        subscriptions: { where: { status: 'active' } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    if (agent.subscriptions.length > 0) {
      return NextResponse.json(
        { error: 'No se puede suspender al agente porque tiene suscripciones activas. Cancela las suscripciones primero.' },
        { status: 400 }
      );
    }

    const updatedAgent = await db.agent.update({
      where: { id },
      data: { status: 'suspended' },
    });

    return NextResponse.json({
      mensaje: 'Agente suspendido correctamente',
      agente: updatedAgent,
    });
  } catch (error) {
    console.error('Error al suspender agente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
