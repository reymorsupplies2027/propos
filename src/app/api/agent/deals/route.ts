import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: List agent's deals ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { agentId }
    if (status) where.status = status

    const deals = await db.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, slug: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('Error al listar negocios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ── POST: Create deal ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const body = await request.json()
    const {
      propertyId,
      clientId,
      dealType,
      status,
      totalPrice,
      currency,
      commission,
      commissionRate,
      closeDate,
      notes,
    } = body

    // Validate that property belongs to agent if provided
    if (propertyId) {
      const prop = await db.property.findFirst({
        where: { id: propertyId, agentId },
      })
      if (!prop) {
        return NextResponse.json(
          { error: 'Propiedad no encontrada o no pertenece al agente' },
          { status: 400 },
        )
      }
    }

    // Validate that client belongs to agent if provided
    if (clientId) {
      const cl = await db.client.findFirst({
        where: { id: clientId, agentId },
      })
      if (!cl) {
        return NextResponse.json(
          { error: 'Cliente no encontrado o no pertenece al agente' },
          { status: 400 },
        )
      }
    }

    const deal = await db.deal.create({
      data: {
        agentId,
        propertyId: propertyId || null,
        clientId: clientId || null,
        dealType: dealType ?? 'sale',
        status: status ?? 'pending',
        totalPrice: totalPrice ?? null,
        currency: currency ?? 'TTD',
        commission: commission ?? null,
        commissionRate: commissionRate ?? null,
        closeDate: closeDate ? new Date(closeDate) : null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('Error al crear negocio:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
