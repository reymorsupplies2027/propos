import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: Agent public profile by slug (no auth required) ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug?.trim()) {
      return NextResponse.json(
        { error: 'El parámetro ?slug= es obligatorio' },
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
        { error: 'Agente no encontrado' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      agente: {
        nombreComercial: agent.businessName,
        nombre: agent.displayName,
        eslogan: agent.tagline,
        biografia: agent.bio,
        telefono: agent.phone,
        whatsapp: agent.whatsapp,
        correo: agent.email,
        facebook: agent.facebook,
        instagram: agent.instagram,
        logo: agent.logo,
        imagenPortada: agent.heroImage,
        colorPrimario: agent.primaryColor,
        colorAcento: agent.accentColor,
        ciudad: agent.city,
        pais: agent.country,
        cantidadPropiedades: agent._count.properties,
        tratosCerrados: agent._count.deals,
      },
    })
  } catch (error) {
    console.error('Error al obtener perfil público del agente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
