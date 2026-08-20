import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAgent, generateSlug } from '@/lib/agent-auth'

// ── GET: List agent's properties ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const listingType = searchParams.get('listingType')

    const where: Record<string, unknown> = { agentId }
    if (status) where.status = status
    if (type) where.propertyType = type
    if (listingType) where.listingType = listingType
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { city: { contains: search } },
        { neighborhood: { contains: search } },
      ]
    }

    const properties = await db.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inquiries: true } },
      },
    })

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Error al listar propiedades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

// ── POST: Create property ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request)
    if (auth instanceof NextResponse) return auth
    const { agentId } = auth.ctx

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

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es obligatorio' },
        { status: 400 },
      )
    }

    let slug = generateSlug(title)

    // Ensure unique slug per agent
    const existing = await db.property.findUnique({
      where: { agentId_slug: { agentId, slug } },
    })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    const property = await db.property.create({
      data: {
        agentId,
        title: title.trim(),
        slug,
        description: description ?? null,
        propertyType: propertyType ?? 'residential',
        listingType: listingType ?? 'sale',
        status: status ?? 'available',
        price: price ?? null,
        currency: currency ?? 'TTD',
        bedrooms: bedrooms ?? null,
        bathrooms: bathrooms ?? null,
        areaSqm: areaSqm ?? null,
        lotSizeSqm: lotSizeSqm ?? null,
        yearBuilt: yearBuilt ?? null,
        address: address ?? null,
        city: city ?? null,
        neighborhood: neighborhood ?? null,
        country: country ?? 'TT',
        lat: lat ?? null,
        lng: lng ?? null,
        features: features ? JSON.stringify(features) : '[]',
        images: images ? JSON.stringify(images) : '[]',
        isFeatured: isFeatured ?? false,
      },
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Error al crear propiedad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
