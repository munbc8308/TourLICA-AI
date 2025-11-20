import { NextResponse } from 'next/server';
import { getKafkaProducer } from '@/lib/kafka';

export const dynamic = 'force-dynamic';

const topic = process.env.KAFKA_TOPIC ?? 'tourlica-events';

export async function POST(request: Request) {
  const payload = await request.json();
  const producer = await getKafkaProducer();

  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify({ ...payload, ts: Date.now() })
      }
    ]
  });

  return NextResponse.json({ ok: true });
}
