import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo electrónico y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check PlatformOwner first
    const owner = await db.platformOwner.findUnique({
      where: { email: normalizedEmail },
    });

    if (owner) {
      const valid = await verifyPassword(password, owner.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: 'Credenciales inválidas' },
          { status: 401 }
        );
      }

      const token = createToken({
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: 'platform_owner',
      });

      const response = NextResponse.json({
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'platform_owner',
        },
        token,
      });

      response.cookies.set('propos-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Check PlatformUser (agents)
    const user = await db.platformUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });

    response.cookies.set('propos-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
