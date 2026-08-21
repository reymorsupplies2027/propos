import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: List agent's tax obligations ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { agentId }
    if (status) where.status = status

    const taxes = await db.taxObligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ taxes })
  } catch (error) {
    console.error('Error listing tax obligations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── POST: Create tax obligation ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const body = await request.json()
    const { taxType, description, period, dueDate, amount, currency, notes } = body

    if (!taxType?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'Tax type and description are required' },
        { status: 400 },
      )
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 },
      )
    }

    const tax = await db.taxObligation.create({
      data: {
        agentId,
        taxType: taxType.trim(),
        description: description.trim(),
        period: period ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        amount,
        currency: currency ?? 'TTD',
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ tax }, { status: 201 })
  } catch (error) {
    console.error('Error creating tax obligation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── PATCH: Mark tax as paid (inline, id in body) ────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const body = await request.json()
    const { id, status, paidAt } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 },
      )
    }

    const existing = await db.taxObligation.findFirst({
      where: { id, agentId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Tax obligation not found' },
        { status: 404 },
      )
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (paidAt !== undefined) {
      data.paidAt = paidAt ? new Date(paidAt) : null
    } else if (status === 'paid') {
      data.paidAt = new Date()
    }

    const tax = await db.taxObligation.update({
      where: { id },
      data,
    })

    return NextResponse.json({ tax })
  } catch (error) {
    console.error('Error updating tax obligation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
