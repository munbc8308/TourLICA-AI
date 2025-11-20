import { NextResponse } from 'next/server';
import { findAccountByCredentials } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: '아이디와 패스워드를 입력하세요.' }, { status: 400 });
  }

  const account = await findAccountByCredentials(email, password);

  if (!account) {
    return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 401 });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      role: account.role,
      name: account.name,
      email: account.email
    }
  });
}
