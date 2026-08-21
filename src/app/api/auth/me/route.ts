import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('propos-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { id, role } = payload as { id: string; role: string };

    if (role === 'platform_owner') {
      const owner = await db.platformOwner.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!owner) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'platform_owner',
        },
      });
    }

    if (role === 'agent') {
      const user = await db.platformUser.findUnique({
        where: { id },
        include: {
          agent: true,
        },
      });

      if (!user || !user.agent) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        agent: user.agent,
      });
    }

    return NextResponse.json(
      { error: 'Unrecognized role' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
