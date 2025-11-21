import { NextResponse } from 'next/server';
import { markMatchRequestMatched, MatchRole } from '@/lib/match-requests';
import { getKafkaProducer } from '@/lib/kafka';

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
    await publishMatchResponse({
      assignmentId: result.assignmentId,
      request: { ...result.request, id: requestId },
      responderAccountId,
      responderRole
    });
    return NextResponse.json({ assignmentId: result.assignmentId, request: result.request });
  } catch (error) {
    console.error('매칭 수락 중 오류:', error);
    return NextResponse.json({ error: '매칭 수락 처리에 실패했습니다.' }, { status: 400 });
  }
}

function isServiceRole(role: string): role is MatchRole {
  return role === 'interpreter' || role === 'helper';
}

async function publishMatchResponse(args: {
  assignmentId: number;
  request: { id: number; requesterAccountId: number | null; requesterName: string | null; targetRole: MatchRole; latitude: number; longitude: number };
  responderAccountId: number;
  responderRole: MatchRole;
}) {
  try {
    const producer = await getKafkaProducer();
    await producer.send({
      topic: process.env.KAFKA_TOPIC ?? 'tourlica-events',
      messages: [
        {
          value: JSON.stringify({
            type: 'match_response',
            requestId: args.request.id,
            assignmentId: args.assignmentId,
            touristAccountId: args.request.requesterAccountId,
            touristName: args.request.requesterName,
            responderAccountId: args.responderAccountId,
            responderRole: args.responderRole,
            location: {
              lat: args.request.latitude,
              lng: args.request.longitude
            },
            ts: Date.now()
          })
        }
      ]
    });
  } catch (err) {
    console.warn('매칭 응답 이벤트 발행 실패', err);
  }
}
