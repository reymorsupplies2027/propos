import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── POST: Submit property inquiry from public portal (no auth) ────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentSlug, propertyId, name, email, phone, message } = body

    // Validate required fields
    if (!agentSlug?.trim() || !propertyId?.trim() || !name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Los campos agentSlug, propertyId, name y email son obligatorios' },
        { status: 400 },
      )
    }

    // Look up agent by slug
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

    // Verify property belongs to this agent
    const property = await db.property.findFirst({
      where: { id: propertyId, agentId: agent.id },
      select: { id: true },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 },
      )
    }

    // Split name into firstName / lastName (last word = lastName, rest = firstName)
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

    // Create or update Client (check by email + agentId)
    // Note: no composite unique on email+agentId, so we use findFirst
    let client = await db.client.findFirst({
      where: { email, agentId: agent.id },
    })

    if (client) {
      // Update lastContactAt
      client = await db.client.update({
        where: { id: client.id },
        data: {
          lastContactAt: new Date(),
          phone: phone || client.phone,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new client
      client = await db.client.create({
        data: {
          agentId: agent.id,
          firstName,
          lastName,
          email,
          phone: phone || null,
          source: 'portal',
        },
      })
    }

    // Create Inquiry
    const inquiry = await db.inquiry.create({
      data: {
        propertyId,
        clientId: client.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone || null,
        message: message || null,
        source: 'portal',
        status: 'new',
        isRead: false,
      },
    })

    return NextResponse.json({
      consulta: {
        id: inquiry.id,
        propiedadId: inquiry.propertyId,
        nombre: inquiry.name,
        correo: inquiry.email,
        mensaje: inquiry.message,
        estado: inquiry.status,
        creadoEn: inquiry.createdAt,
      },
      cliente: {
        id: client.id,
        nombre: `${client.firstName} ${client.lastName}`.trim(),
        correo: client.email,
        telefono: client.phone,
        fuente: client.source,
      },
    })
  } catch (error) {
    console.error('Error al enviar consulta:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
