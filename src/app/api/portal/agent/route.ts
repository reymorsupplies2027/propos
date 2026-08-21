import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: Agent public profile by slug (no auth required) ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug?.trim()) {
      return NextResponse.json(
        { error: 'The ?slug= parameter is required' },
        { status: 400 },
      )
    }

    const agent = await db.agent.findUnique({
      where: { slug },
      select: {
        id: true,
        businessName: true,
        displayName: true,
        tagline: true,
        bio: true,
        phone: true,
        whatsapp: true,
        email: true,
        facebook: true,
        instagram: true,
        logo: true,
        heroImage: true,
        primaryColor: true,
        accentColor: true,
        city: true,
        country: true,
        _count: {
          select: {
            properties: { where: { publishedAt: { not: null } } },
            deals: { where: { status: 'closed' } },
          },
        },
      },
    })

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      agent: {
        businessName: agent.businessName,
        name: agent.displayName,
        tagline: agent.tagline,
        bio: agent.bio,
        phone: agent.phone,
        whatsapp: agent.whatsapp,
        email: agent.email,
        facebook: agent.facebook,
        instagram: agent.instagram,
        logo: agent.logo,
        heroImage: agent.heroImage,
        primaryColor: agent.primaryColor,
        accentColor: agent.accentColor,
        city: agent.city,
        country: agent.country,
        propertyCount: agent._count.properties,
        dealsClosed: agent._count.deals,
      },
    })
  } catch (error) {
    console.error('Error fetching public agent profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
