// 예제: 관광객 앱에서 매칭된 통역사의 실시간 위치 구독
// 실제 프로덕션에서는 WebSocket이나 Server-Sent Events와 연동

import { createKafkaInstance } from '@/lib/kafka';

interface LocationUpdate {
  interpreterId: string;
  location: { latitude: number; longitude: number };
  timestamp: number;
}

/**
 * 특정 통역사의 위치 업데이트를 구독하는 컨슈머
 * @param interpreterId - 구독할 통역사 ID
 * @param onLocationUpdate - 위치 업데이트 콜백 함수
 */
export async function subscribeToInterpreterLocation(
  interpreterId: string,
  onLocationUpdate: (location: LocationUpdate) => void
) {
  const kafka = createKafkaInstance();
  const consumer = kafka.consumer({
    groupId: `tourist-${interpreterId}-location-viewer`,
    // 각 관광객마다 별도 그룹 ID로 모든 메시지 수신
  });

  await consumer.connect();
  await consumer.subscribe({
    topic: 'interpreter-location-updates',
    fromBeginning: false  // 최신 메시지부터만 구독
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const data: LocationUpdate = JSON.parse(message.value.toString());

      // 🔍 메시지 필터링: 매칭된 통역사만 처리
      if (data.interpreterId === interpreterId) {
        onLocationUpdate(data);
      }
      // 다른 통역사 메시지는 무시 (네트워크 비용은 발생하지만 처리는 스킵)
    }
  });

  return consumer;  // 구독 해제용
}

// ===== 대안: 고급 패턴 - Redis Streams로 변환 =====

/**
 * Kafka → Redis Streams 브리지 컨슈머
 * 각 통역사별로 Redis Stream 생성 (빠른 개별 조회)
 */
export async function startLocationBridge() {
  const kafka = createKafkaInstance();
  const consumer = kafka.consumer({
    groupId: 'location-to-redis-bridge'
  });

  // Redis 클라이언트 (예시)
  // const redis = new Redis();

  await consumer.connect();
  await consumer.subscribe({ topic: 'interpreter-location-updates' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const data: LocationUpdate = JSON.parse(message.value.toString());

      // Redis Stream에 통역사별로 저장
      // await redis.xadd(
      //   `interpreter:${data.interpreterId}:locations`,
      //   '*',
      //   'lat', data.location.latitude,
      //   'lng', data.location.longitude,
      //   'ts', data.timestamp
      // );

      // Redis에서 최근 10개만 유지 (XTRIM)
      // await redis.xtrim(
      //   `interpreter:${data.interpreterId}:locations`,
      //   'MAXLEN', '~', 10
      // );
    }
  });
}

// ===== 사용 예시 =====

// 관광객 앱에서 실시간 위치 표시
async function touristViewInterpreterLocation(matchedInterpreterId: string) {
  const consumer = await subscribeToInterpreterLocation(
    matchedInterpreterId,
    (location) => {
      console.log(`통역사 ${location.interpreterId} 위치:`, location.location);
      // 지도 마커 업데이트
      // updateMapMarker(location.location.latitude, location.location.longitude);
    }
  );

  // 매칭 종료 시 구독 해제
  // await consumer.disconnect();
}
