import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: Public properties listing (no auth required) ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentSlug = searchParams.get('agent')

    if (!agentSlug?.trim()) {
      return NextResponse.json(
        { error: 'The ?agent= parameter is required' },
        { status: 400 },
      )
    }

    // Look up agent by slug — only expose public fields
    const agent = await db.agent.findUnique({
      where: { slug: agentSlug },
      select: {
        id: true,
        businessName: true,
        primaryColor: true,
        accentColor: true,
        logo: true,
        phone: true,
        whatsapp: true,
      },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    // Build filters from query params
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const listingType = searchParams.get('listingType')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const bedrooms = searchParams.get('bedrooms')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)))
    const skip = (page - 1) * limit

    // Only published properties for this agent
    const where: Record<string, unknown> = {
      agentId: agent.id,
      publishedAt: { not: null },
    }

    if (status) where.status = status
    if (type) where.propertyType = type
    if (listingType) where.listingType = listingType
    if (minPrice) where.price = { ...((where.price as Record<string, unknown>) || {}), gte: parseFloat(minPrice) }
    if (maxPrice) where.price = { ...((where.price as Record<string, unknown>) || {}), lte: parseFloat(maxPrice) }
    if (bedrooms) where.bedrooms = { gte: parseInt(bedrooms, 10) }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { city: { contains: search } },
        { neighborhood: { contains: search } },
        { address: { contains: search } },
      ]
    }

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          propertyType: true,
          listingType: true,
          status: true,
          price: true,
          currency: true,
          bedrooms: true,
          bathrooms: true,
          areaSqm: true,
          lotSizeSqm: true,
          yearBuilt: true,
          address: true,
          city: true,
          neighborhood: true,
          country: true,
          lat: true,
          lng: true,
          features: true,
          images: true,
          isFeatured: true,
          virtualTourUrl: true,
          videoUrl: true,
          publishedAt: true,
          _count: { select: { inquiries: true } },
        },
      }),
      db.property.count({ where }),
    ])

    // Parse JSON fields for each property
    const parsed = properties.map((p) => ({
      ...p,
      features: JSON.parse(p.features),
      images: JSON.parse(p.images),
    }))

    return NextResponse.json({
      agent: {
        businessName: agent.businessName,
        primaryColor: agent.primaryColor,
        accentColor: agent.accentColor,
        logo: agent.logo,
        phone: agent.phone,
        whatsapp: agent.whatsapp,
      },
      properties: parsed,
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing public properties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
