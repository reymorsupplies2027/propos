import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: List agent's property inquiries ───────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const unread = searchParams.get('unread')

    // Build the where clause filtering by agent through property relation
    // We need properties that belong to this agent
    const agentPropertyIds = await db.property.findMany({
      where: { agentId },
      select: { id: true },
    })
    const propertyIds = agentPropertyIds.map((p) => p.id)

    const where: Record<string, unknown> = {
      propertyId: { in: propertyIds },
    }
    if (status) where.status = status
    if (unread === 'true') where.isRead = false

    const inquiries = await db.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, slug: true } },
      },
    })

    return NextResponse.json({ inquiries })
  } catch (error) {
    console.error('Error listing inquiries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── PATCH: Update inquiry status or mark as read ───────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const body = await request.json()
    const { id, status, isRead } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 },
      )
    }

    // Verify the inquiry belongs to a property of this agent
    const agentPropertyIds = await db.property.findMany({
      where: { agentId },
      select: { id: true },
    })
    const propertyIds = agentPropertyIds.map((p) => p.id)

    const existing = await db.inquiry.findFirst({
      where: { id, propertyId: { in: propertyIds } },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 },
      )
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (isRead !== undefined) data.isRead = isRead

    const inquiry = await db.inquiry.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, title: true, slug: true } },
      },
    })

    return NextResponse.json({ inquiry })
  } catch (error) {
    console.error('Error updating inquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
