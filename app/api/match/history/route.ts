import { NextResponse } from 'next/server';
import { listAssignmentsForAccount } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = Number(body.accountId);
  const perspective = body.perspective === 'responder' ? 'responder' : 'tourist';
  const limit = Number(body.limit);

  if (!Number.isFinite(accountId)) {
    return NextResponse.json({ history: [] });
  }

  const history = await listAssignmentsForAccount({ accountId, perspective, limit: Number.isFinite(limit) ? limit : 20 });
  return NextResponse.json({ history });
}
