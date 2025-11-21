import { createKafkaInstance, getKafkaConfig } from '@/lib/kafka';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const topic = process.env.KAFKA_TOPIC ?? 'tourlica-events';
  const kafka = createKafkaInstance();
  const consumer = kafka.consumer({
    groupId: `tourlica-stream-${Math.random().toString(36).slice(2)}`,
    allowAutoTopicCreation: false
  });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await consumer.connect();
      await consumer.subscribe({ topic });
      controller.enqueue(encoder.encode('event: ping\ndata: connected\n\n'));

      consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          controller.enqueue(encoder.encode(`data: ${message.value.toString()}\n\n`));
        }
      });
    },
    async cancel() {
      await consumer.disconnect();
    }
  });

  request.signal?.addEventListener('abort', () => {
    consumer.disconnect().catch(() => {});
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
