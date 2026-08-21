import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export interface AgentContext {
  userId: string;
  agentId: string;
}

/**
 * Verify JWT from cookie, resolve PlatformUser → Agent.
 * Returns { userId, agentId } on success, or a NextResponse error.
 */
export async function authenticateAgent(
  request: NextRequest,
): Promise<{ ctx: AgentContext } | NextResponse> {
  const token = request.cookies.get('propos-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { id: userId, role } = payload as { id: string; role: string };
  if (role !== 'agent') {
    return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
  }

  const agent = await db.agent.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!agent) {
    return NextResponse.json(
      { error: 'Agent profile not found' },
      { status: 404 },
    );
  }

  return { ctx: { userId, agentId: agent.id } };
}

/** Generate a URL-friendly slug from a title. */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
