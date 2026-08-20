import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent } from '@/lib/agent-auth'

// ── GET: Single property ────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const property = await db.property.findFirst({
      where: { id, agentId },
      include: {
        _count: { select: { inquiries: true, deals: true } },
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Error al obtener propiedad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ── PATCH: Update property ──────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const existing = await db.property.findFirst({
      where: { id, agentId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 },
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      propertyType,
      listingType,
      status,
      price,
      currency,
      bedrooms,
      bathrooms,
      areaSqm,
      lotSizeSqm,
      yearBuilt,
      address,
      city,
      neighborhood,
      country,
      lat,
      lng,
      features,
      images,
      isFeatured,
    } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (description !== undefined) data.description = description
    if (propertyType !== undefined) data.propertyType = propertyType
    if (listingType !== undefined) data.listingType = listingType
    if (status !== undefined) data.status = status
    if (price !== undefined) data.price = price
    if (currency !== undefined) data.currency = currency
    if (bedrooms !== undefined) data.bedrooms = bedrooms
    if (bathrooms !== undefined) data.bathrooms = bathrooms
    if (areaSqm !== undefined) data.areaSqm = areaSqm
    if (lotSizeSqm !== undefined) data.lotSizeSqm = lotSizeSqm
    if (yearBuilt !== undefined) data.yearBuilt = yearBuilt
    if (address !== undefined) data.address = address
    if (city !== undefined) data.city = city
    if (neighborhood !== undefined) data.neighborhood = neighborhood
    if (country !== undefined) data.country = country
    if (lat !== undefined) data.lat = lat
    if (lng !== undefined) data.lng = lng
    if (features !== undefined) data.features = JSON.stringify(features)
    if (images !== undefined) data.images = JSON.stringify(images)
    if (isFeatured !== undefined) data.isFeatured = isFeatured

    const property = await db.property.update({
      where: { id },
      data,
    })

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Error al actualizar propiedad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ── DELETE: Remove property ─────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { id } = await params

    const existing = await db.property.findFirst({
      where: { id, agentId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 },
      )
    }

    await db.property.delete({ where: { id } })

    return NextResponse.json({ mensaje: 'Propiedad eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar propiedad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
