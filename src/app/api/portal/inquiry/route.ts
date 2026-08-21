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
        { error: 'The fields agentSlug, propertyId, name and email are required' },
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
        { error: 'Agent not found' },
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
        { error: 'Property not found' },
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
      inquiry: {
        id: inquiry.id,
        propertyId: inquiry.propertyId,
        name: inquiry.name,
        email: inquiry.email,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`.trim(),
        email: client.email,
        phone: client.phone,
        source: client.source,
      },
    })
  } catch (error) {
    console.error('Error submitting inquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
