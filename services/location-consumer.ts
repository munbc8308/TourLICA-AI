/**
 * Kafka Consumer: 통역사 위치 업데이트를 Redis에 캐싱
 *
 * 실행 방법:
 * npx tsx services/location-consumer.ts
 */

import { createKafkaInstance } from '@/lib/kafka';
import { cacheInterpreterLocation, type CachedLocation } from '@/lib/redis';

interface LocationUpdateEvent {
  type: 'location_update';
  interpreterId: string;
  location: CachedLocation;
  timestamp: number;
}

async function startLocationConsumer() {
  const kafka = createKafkaInstance();
  const consumer = kafka.consumer({
    groupId: process.env.KAFKA_LOCATION_CONSUMER_GROUP ?? 'location-to-redis-processor',
    // Consumer Group으로 여러 인스턴스가 파티션을 나눠서 처리
  });

  const topic = process.env.KAFKA_LOCATION_TOPIC ?? 'interpreter-location-updates';

  // Graceful shutdown 처리
  const errorTypes = ['unhandledRejection', 'uncaughtException'];
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

  errorTypes.forEach((type) => {
    process.on(type, async (e) => {
      try {
        console.log(`Process ${type}:`, e);
        await consumer.disconnect();
        process.exit(0);
      } catch (_) {
        process.exit(1);
      }
    });
  });

  signalTraps.forEach((type) => {
    process.once(type as NodeJS.Signals, async () => {
      try {
        console.log(`Received ${type}, shutting down gracefully...`);
        await consumer.disconnect();
      } finally {
        process.kill(process.pid, type);
      }
    });
  });

  try {
    await consumer.connect();
    console.log(`✅ Kafka consumer connected`);

    await consumer.subscribe({
      topic,
      fromBeginning: false  // 최신 메시지부터만 처리
    });
    console.log(`✅ Subscribed to topic: ${topic}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            console.warn('Received empty message');
            return;
          }

          const event: LocationUpdateEvent = JSON.parse(message.value.toString());

          // 이벤트 타입 검증
          if (event.type !== 'location_update') {
            console.warn(`Unknown event type: ${event.type}`);
            return;
          }

          // Redis에 최신 위치 캐싱
          await cacheInterpreterLocation(event.interpreterId, {
            ...event.location,
            timestamp: event.timestamp
          });

          console.log(
            `📍 [Partition ${partition}] Updated location for interpreter: ${event.interpreterId}`,
            `(${event.location.latitude}, ${event.location.longitude})`
          );

          // 추가 처리 예시:
          // 1. PostgreSQL에 주기적으로 배치 저장 (5분 단위)
          // 2. 관광객에게 WebSocket으로 실시간 전송
          // 3. 지오펜싱 알림 (특정 지역 진입 시)

        } catch (error) {
          console.error('Failed to process message:', error);
          // 에러 발생 시에도 컨슈머는 계속 실행 (메시지는 자동으로 커밋됨)
        }
      }
    });

  } catch (error) {
    console.error('Kafka consumer error:', error);
    process.exit(1);
  }
}

// Consumer 시작
console.log('🚀 Starting location consumer...');
startLocationConsumer().catch(console.error);
