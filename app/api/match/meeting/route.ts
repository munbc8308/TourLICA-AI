import { NextResponse } from 'next/server';
import { confirmMeeting, requestMeetingConfirmation } from '@/lib/match-requests';
import { getKafkaProducer } from '@/lib/kafka';

export const dynamic = 'force-dynamic';

const topic = process.env.KAFKA_TOPIC ?? 'tourlica-events';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assignmentId = Number(body.assignmentId);
  const accountId = Number(body.accountId);
  const action = body.action;
  const latitude = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude);
  const longitude = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude);
  const latValue = Number.isFinite(latitude) ? latitude : undefined;
  const lngValue = Number.isFinite(longitude) ? longitude : undefined;

  if (!Number.isFinite(assignmentId) || !Number.isFinite(accountId)) {
    return NextResponse.json({ error: 'assignmentId/accountId 값이 필요합니다.' }, { status: 400 });
  }

  try {
    const producer = await getKafkaProducer();

    if (action === 'arrived') {
      const result = await requestMeetingConfirmation({ assignmentId, responderAccountId: accountId, latitude: latValue, longitude: lngValue });
      if (!result) {
        return NextResponse.json({ error: '매칭 정보를 찾을 수 없습니다.' }, { status: 404 });
      }

      // Publish event for tourist
      await producer.send({
        topic,
        messages: [{
          value: JSON.stringify({
            type: 'match_response',
            touristAccountId: result.touristAccountId,
            assignmentId: result.id,
            status: result.meetingStatus,
            ts: Date.now()
          })
        }]
      });

      return NextResponse.json({ assignment: result });
    }

    if (action === 'confirm') {
      const result = await confirmMeeting({ assignmentId, touristAccountId: accountId, latitude: latValue, longitude: lngValue });
      if (!result) {
        return NextResponse.json({ error: '매칭 정보를 찾을 수 없습니다.' }, { status: 404 });
      }

      // Publish event for responder (though they might be polling, it's good practice)
      // And also for tourist to confirm completion
      await producer.send({
        topic,
        messages: [{
          value: JSON.stringify({
            type: 'match_response',
            touristAccountId: result.touristAccountId,
            assignmentId: result.id,
            status: result.meetingStatus,
            ts: Date.now()
          })
        }]
      });

      return NextResponse.json({ assignment: result, reset: true });
    }

    return NextResponse.json({ error: '지원되지 않는 action 입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Meeting API error:', error);
    return NextResponse.json({ error: '매칭 상태를 업데이트할 수 없습니다.' }, { status: 500 });
  }
}
