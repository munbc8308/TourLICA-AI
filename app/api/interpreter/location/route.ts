import { NextRequest, NextResponse } from 'next/server';
import { getKafkaProducer } from '@/lib/kafka';

interface LocationUpdateRequest {
  interpreterId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;  // GPS 정확도 (미터)
  heading?: number;   // 이동 방향 (0-359도)
  speed?: number;     // 속도 (m/s)
}

interface LocationUpdateEvent {
  type: 'location_update';
  interpreterId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

/**
 * POST /api/interpreter/location
 * 통역사의 실시간 위치를 Kafka에 발행
 */
export async function POST(request: NextRequest) {
  try {
    const body: LocationUpdateRequest = await request.json();

    // 입력 검증
    const { interpreterId, latitude, longitude, accuracy, heading, speed } = body;

    if (!interpreterId || typeof interpreterId !== 'string') {
      return NextResponse.json(
        { error: 'interpreterId is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude must be numbers' },
        { status: 400 }
      );
    }

    // 위도/경도 범위 검증
    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: 'latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Kafka 메시지 생성
    const event: LocationUpdateEvent = {
      type: 'location_update',
      interpreterId,
      location: {
        latitude,
        longitude,
        ...(accuracy !== undefined && { accuracy }),
        ...(heading !== undefined && { heading }),
        ...(speed !== undefined && { speed })
      },
      timestamp: Date.now()
    };

    // Kafka에 발행 (interpreterId를 키로 사용 → 같은 파티션 보장)
    const producer = await getKafkaProducer();
    const topic = process.env.KAFKA_LOCATION_TOPIC ?? 'interpreter-location-updates';

    await producer.send({
      topic,
      messages: [
        {
          key: interpreterId,  // 같은 통역사는 같은 파티션으로 전송 (순서 보장)
          value: JSON.stringify(event),
          timestamp: String(Date.now())
        }
      ]
    });

    return NextResponse.json({
      success: true,
      interpreterId,
      timestamp: event.timestamp
    });

  } catch (error) {
    console.error('Failed to publish location update:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish location update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
