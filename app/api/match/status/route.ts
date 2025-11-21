import { NextResponse } from 'next/server';
import { findPendingRequestByAccount } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = Number(body.accountId ?? body.accountID ?? body.id);

  if (!Number.isFinite(accountId)) {
    return NextResponse.json({ error: 'accountId가 필요합니다.' }, { status: 400 });
  }

  const pending = await findPendingRequestByAccount(accountId);
  return NextResponse.json({ request: pending ?? null });
}
