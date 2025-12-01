import { NextRequest, NextResponse } from 'next/server';
import { getMultipleInterpreterLocations } from '@/lib/redis';

/**
 * GET /api/interpreter/locations?ids=user1,user2,user3
 * 여러 통역사의 위치를 한 번에 조회 (지도에 마커 표시용)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Query parameter "ids" is required (comma-separated)' },
        { status: 400 }
      );
    }

    // 쉼표로 구분된 ID 파싱
    const interpreterIds = idsParam
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    if (interpreterIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one interpreter ID is required' },
        { status: 400 }
      );
    }

    // 최대 50개로 제한 (성능 보호)
    if (interpreterIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 interpreter IDs allowed per request' },
        { status: 400 }
      );
    }

    // Redis에서 배치 조회
    const locationsMap = await getMultipleInterpreterLocations(interpreterIds);

    // Map을 배열로 변환
    const locations = Array.from(locationsMap.entries()).map(([id, location]) => ({
      interpreterId: id,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed
      },
      timestamp: location.timestamp,
      updatedAt: new Date(location.timestamp).toISOString()
    }));

    return NextResponse.json({
      count: locations.length,
      requested: interpreterIds.length,
      locations
    });

  } catch (error) {
    console.error('Failed to fetch multiple interpreter locations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
