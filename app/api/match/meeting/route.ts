import { NextResponse } from 'next/server';
import { confirmMeeting, requestMeetingConfirmation } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assignmentId = Number(body.assignmentId);
  const accountId = Number(body.accountId);
  const action = body.action;

  if (!Number.isFinite(assignmentId) || !Number.isFinite(accountId)) {
    return NextResponse.json({ error: 'assignmentId/accountId 값이 필요합니다.' }, { status: 400 });
  }

  try {
    if (action === 'arrived') {
      const result = await requestMeetingConfirmation({ assignmentId, responderAccountId: accountId });
      if (!result) {
        return NextResponse.json({ error: '매칭 정보를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ assignment: result });
    }

    if (action === 'confirm') {
      const result = await confirmMeeting({ assignmentId, touristAccountId: accountId });
      if (!result) {
        return NextResponse.json({ error: '매칭 정보를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ assignment: result });
    }

    return NextResponse.json({ error: '지원되지 않는 action 입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Meeting API error:', error);
    return NextResponse.json({ error: '매칭 상태를 업데이트할 수 없습니다.' }, { status: 500 });
  }
}
