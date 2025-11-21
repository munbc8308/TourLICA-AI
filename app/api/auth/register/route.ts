import { NextResponse } from 'next/server';
import type { AccountRole } from '@/lib/accounts';
import { createAccount } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

type PublicSignupRole = Extract<AccountRole, 'tourist' | 'interpreter' | 'helper'>;

const allowedRoles: PublicSignupRole[] = ['tourist', 'interpreter', 'helper'];

export async function POST(request: Request) {
  const body = await request.json();
  const role = body.role as PublicSignupRole | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: '회원가입 가능한 역할이 아닙니다.' }, { status: 400 });
  }

  const emailValue = normalize(body.email);
  const email = emailValue ? emailValue.toLowerCase() : null;
  const password = normalize(body.password);
  const name = normalize(body.name);
  const nickname = normalize(body.nickname);
  const phone = normalize(body.phone);
  const gender = normalize(body.gender);
  const country = normalize(body.country);
  const deviceFingerprint = trimLength(normalize(body.deviceFingerprint));
  const interpreterCode = role === 'interpreter' ? normalize(body.interpreterCode) : null;

  if (!email || !password || !name) {
    const missingFields = [
      !email ? '이메일' : null,
      !password ? '패스워드' : null,
      !name ? '이름' : null
    ].filter(Boolean);
    return NextResponse.json({ error: `${missingFields.join(', ')} 정보를 입력하세요.` }, { status: 400 });
  }

  if (role === 'interpreter' && !interpreterCode) {
    return NextResponse.json({ error: '통역사 고유번호를 입력하세요.' }, { status: 400 });
  }

  try {
    const account = await createAccount({
      role,
      email,
      password,
      name,
      nickname,
      phone,
      gender,
      country,
      deviceFingerprint,
      interpreterCode
    });

    return NextResponse.json(
      {
        account: {
          id: account.id,
          role: account.role,
          name: account.name,
          email: account.email
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 이메일 또는 통역사 코드입니다.' }, { status: 409 });
    }

    console.error('회원가입 실패:', error);
    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimLength(value: string | null, max = 512): string | null {
  if (!value) return value;
  return value.length > max ? value.slice(0, max) : value;
}
