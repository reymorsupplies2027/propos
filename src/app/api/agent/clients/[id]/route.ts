import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: Single client with inquiries ───────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const client = await db.client.findFirst({
      where: { id, agentId },
      include: {
        inquiries: {
          include: { property: { select: { id: true, title: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
        },
        deals: {
          include: { property: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── PATCH: Update client ───────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const existing = await db.client.findFirst({ where: { id, agentId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 },
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      source,
      budgetMin,
      budgetMax,
      preferredType,
      preferredCity,
      notes,
      status,
    } = body

    const data: Record<string, unknown> = {}
    if (firstName !== undefined) data.firstName = firstName.trim()
    if (lastName !== undefined) data.lastName = lastName.trim()
    if (email !== undefined) data.email = email?.trim() || null
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (source !== undefined) data.source = source
    if (budgetMin !== undefined) data.budgetMin = budgetMin
    if (budgetMax !== undefined) data.budgetMax = budgetMax
    if (preferredType !== undefined) data.preferredType = preferredType
    if (preferredCity !== undefined) data.preferredCity = preferredCity
    if (notes !== undefined) data.notes = notes
    if (status !== undefined) data.status = status

    const client = await db.client.update({ where: { id }, data })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── DELETE: Remove client ──────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const existing = await db.client.findFirst({ where: { id, agentId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 },
      )
    }

    await db.client.delete({ where: { id } })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
