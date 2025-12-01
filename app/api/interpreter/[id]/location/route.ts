import { NextRequest, NextResponse } from 'next/server';
import { getInterpreterLocation } from '@/lib/redis';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/interpreter/{id}/location
 * 특정 통역사의 최신 위치 조회 (Redis 캐시)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: interpreterId } = await params;

    if (!interpreterId) {
      return NextResponse.json(
        { error: 'Interpreter ID is required' },
        { status: 400 }
      );
    }

    // Redis에서 최신 위치 조회
    const location = await getInterpreterLocation(interpreterId);

    if (!location) {
      return NextResponse.json(
        {
          error: 'Location not found',
          message: 'Interpreter location is not available or has expired'
        },
        { status: 404 }
      );
    }

    // 위치 정보가 너무 오래된 경우 경고
    const ageInMinutes = (Date.now() - location.timestamp) / 1000 / 60;
    const isStale = ageInMinutes > 5;

    return NextResponse.json({
      interpreterId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed
      },
      timestamp: location.timestamp,
      updatedAt: new Date(location.timestamp).toISOString(),
      ageMinutes: Math.round(ageInMinutes * 10) / 10,
      isStale  // 5분 이상 업데이트 안됨
    });

  } catch (error) {
    console.error('Failed to fetch interpreter location:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch location',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
