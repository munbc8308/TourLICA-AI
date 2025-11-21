import { NextResponse } from 'next/server';
import { getPendingMatchRequests, MatchRole } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  if (!role || !isServiceRole(role)) {
    return NextResponse.json({ error: 'role 쿼리 파라미터가 필요합니다.' }, { status: 400 });
  }

  const requests = await getPendingMatchRequests(role);
  return NextResponse.json({ requests });
}

function isServiceRole(role: string): role is MatchRole {
  return role === 'interpreter' || role === 'helper';
}
