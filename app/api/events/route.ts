import { NextResponse } from 'next/server';
import { getKafkaProducer } from '@/lib/kafka';
import { cancelMatchRequestById, cancelPendingRequestsByAccount, createMatchRequest } from '@/lib/match-requests';

export const dynamic = 'force-dynamic';

const topic = process.env.KAFKA_TOPIC ?? 'tourlica-events';

export async function POST(request: Request) {
  const payload = await request.json();
  const producer = await getKafkaProducer();
  let matchRequestRecord: Awaited<ReturnType<typeof createMatchRequest>> | null = null;
  const eventType = payload?.type;

  if (eventType === 'match_request') {
    const coordinates = parseLocation(payload.location);
    if (!coordinates) {
      return NextResponse.json({ error: '위치 정보가 필요합니다.' }, { status: 400 });
    }

    const accountId = Number(payload.accountId);
    const requesterAccountId = Number.isFinite(accountId) ? accountId : null;
    const radiusValue = Number(payload.radiusKm);

    matchRequestRecord = await createMatchRequest({
      requesterAccountId,
      requesterName: payload.requesterName ?? null,
      requesterRole: 'tourist',
      targetRole: sanitizeRole(payload.targetRole),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      radiusKm: Number.isFinite(radiusValue) ? radiusValue : null,
      device: payload.device ?? null
    });
  } else if (eventType === 'match_cancel') {
    const requestId = Number(payload.requestId);
    const accountId = Number(payload.accountId);
    if (Number.isFinite(requestId)) {
      await cancelMatchRequestById(requestId, Number.isFinite(accountId) ? accountId : undefined);
    } else if (Number.isFinite(accountId)) {
      await cancelPendingRequestsByAccount(accountId);
    }
  }

  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify({ ...payload, ts: Date.now() })
      }
    ]
  });

  return NextResponse.json({ ok: true, matchRequest: matchRequestRecord });
}

function parseLocation(location: any): { lat: number; lng: number } | null {
  const lat = typeof location?.lat === 'number' ? location.lat : Number.parseFloat(location?.lat);
  const lng = typeof location?.lng === 'number' ? location.lng : Number.parseFloat(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function sanitizeRole(role: unknown) {
  return role === 'helper' ? 'helper' : 'interpreter';
}
