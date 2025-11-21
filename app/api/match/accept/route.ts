import { NextResponse } from 'next/server';
import { markMatchRequestMatched, MatchRole } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const requestId = Number(body.requestId);
  const responderAccountId = Number(body.responderAccountId);
  const responderRole = body.responderRole as MatchRole | undefined;

  if (!Number.isFinite(requestId) || !Number.isFinite(responderAccountId)) {
    return NextResponse.json({ error: '요청 ID와 계정 ID가 필요합니다.' }, { status: 400 });
  }

  if (!responderRole || !isServiceRole(responderRole)) {
    return NextResponse.json({ error: '지원 가능한 역할이 아닙니다.' }, { status: 400 });
  }

  try {
    const result = await markMatchRequestMatched({ requestId, responderAccountId, responderRole });
    return NextResponse.json({ assignmentId: result.assignmentId, request: result.request });
  } catch (error) {
    console.error('매칭 수락 중 오류:', error);
    return NextResponse.json({ error: '매칭 수락 처리에 실패했습니다.' }, { status: 400 });
  }
}

function isServiceRole(role: string): role is MatchRole {
  return role === 'interpreter' || role === 'helper';
}
