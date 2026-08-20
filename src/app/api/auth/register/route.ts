import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, businessName, phone, city } = body;

    if (!email || !name || !password || !businessName) {
      return NextResponse.json(
        { error: 'Correo electrónico, nombre, contraseña y nombre del negocio son obligatorios' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const slug = generateSlug(businessName);

    // Check uniqueness
    const existingOwner = await db.platformOwner.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingOwner) {
      return NextResponse.json(
        { error: 'Este correo electrónico ya está registrado' },
        { status: 409 }
      );
    }

    const existingUser = await db.platformUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo electrónico ya está registrado' },
        { status: 409 }
      );
    }

    const existingAgentSlug = await db.agent.findUnique({
      where: { slug },
    });
    if (existingAgentSlug) {
      return NextResponse.json(
        { error: 'El nombre del negocio ya está en uso' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.platformUser.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: 'agent',
        agent: {
          create: {
            slug,
            businessName: businessName.trim(),
            displayName: businessName.trim(),
            phone: phone?.trim() || '',
            email: normalizedEmail,
            city: city?.trim() || 'Arima',
            primaryColor: '#1B4332',
            accentColor: '#D4A373',
          },
        },
      },
      include: {
        agent: true,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        agent: user.agent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
