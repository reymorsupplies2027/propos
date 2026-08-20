import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── POST: Track visitor event (no auth required) ──────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      agentSlug,
      eventType,
      page,
      elementId,
      elementText,
      propertySlug,
      sessionId,
      referrer,
      dwellTimeMs,
      metadata,
    } = body

    if (!agentSlug?.trim() || !eventType?.trim()) {
      return NextResponse.json(
        { error: 'Los campos agentSlug y eventType son obligatorios' },
        { status: 400 },
      )
    }

    // Look up agent by slug to get agentId
    const agent = await db.agent.findUnique({
      where: { slug: agentSlug },
      select: { id: true },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 },
      )
    }

    // Capture headers
    const userAgent = request.headers.get('user-agent') || null
    // Use X-Forwarded-For first (behind proxy), then fall back to remote address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null

    await db.visitorEvent.create({
      data: {
        agentId: agent.id,
        sessionId: sessionId || null,
        eventType,
        page: page || null,
        elementId: elementId || null,
        elementText: elementText || null,
        propertySlug: propertySlug || null,
        referrer: referrer || null,
        userAgent,
        ip,
        dwellTimeMs: dwellTimeMs != null ? parseInt(dwellTimeMs, 10) : null,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      },
    })

    return NextResponse.json({ rastreado: true })
  } catch (error) {
    console.error('Error al rastrear evento de visitante:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
