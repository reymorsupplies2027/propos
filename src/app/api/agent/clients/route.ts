import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: List agent's clients ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { agentId }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inquiries: true, deals: true } },
      },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error listing clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── POST: Create client ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

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
    } = body

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 },
      )
    }

    const client = await db.client.create({
      data: {
        agentId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        source: source ?? 'website',
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
        preferredType: preferredType ?? null,
        preferredCity: preferredCity ?? null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
