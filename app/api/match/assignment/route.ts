import { NextResponse } from 'next/server';
import { getAssignmentForAccount } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = Number(body.accountId ?? body.accountID);
  const perspective = body.perspective === 'responder' ? 'responder' : 'tourist';

  if (!Number.isFinite(accountId)) {
    return NextResponse.json({ assignment: null });
  }

  const assignment = await getAssignmentForAccount({ accountId, perspective });
  return NextResponse.json({ assignment: assignment ?? null });
}
