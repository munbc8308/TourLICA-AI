import { NextResponse } from 'next/server';
import { findAccountById } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = Number(body.accountId ?? body.id);

  if (!Number.isFinite(accountId)) {
    return NextResponse.json({ error: 'accountId가 필요합니다.' }, { status: 400 });
  }

  const account = await findAccountById(accountId);
  if (!account) {
    return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ account });
}
