import 'server-only';
import { createClient, RedisClientType } from 'redis';
import { ensureEnvLoaded } from './load-env';

ensureEnvLoaded();

let redisClient: RedisClientType | null = null;

/**
 * Redis 싱글톤 클라이언트 생성
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return new Error('Redis reconnection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis: Connected successfully');
  });

  await redisClient.connect();

  return redisClient;
}

/**
 * Redis 연결 종료 (graceful shutdown용)
 */
export async function disconnectRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// ===== 위치 데이터 전용 헬퍼 함수 =====

export interface CachedLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

const LOCATION_KEY_PREFIX = 'interpreter:location:';
const LOCATION_TTL = 3600; // 1시간 (초 단위)

/**
 * 통역사의 최신 위치를 Redis에 저장
 */
export async function cacheInterpreterLocation(
  interpreterId: string,
  location: CachedLocation
): Promise<void> {
  const client = await getRedisClient();
  const key = `${LOCATION_KEY_PREFIX}${interpreterId}`;

  await client.setEx(
    key,
    LOCATION_TTL,
    JSON.stringify(location)
  );
}

/**
 * 통역사의 최신 위치를 Redis에서 조회
 */
export async function getInterpreterLocation(
  interpreterId: string
): Promise<CachedLocation | null> {
  const client = await getRedisClient();
  const key = `${LOCATION_KEY_PREFIX}${interpreterId}`;

  const data = await client.get(key);
  if (!data) return null;

  return JSON.parse(data) as CachedLocation;
}

/**
 * 여러 통역사의 위치를 한 번에 조회 (배치 조회)
 */
export async function getMultipleInterpreterLocations(
  interpreterIds: string[]
): Promise<Map<string, CachedLocation>> {
  if (interpreterIds.length === 0) {
    return new Map();
  }

  const client = await getRedisClient();
  const keys = interpreterIds.map(id => `${LOCATION_KEY_PREFIX}${id}`);

  const values = await client.mGet(keys);

  const result = new Map<string, CachedLocation>();

  values.forEach((value, index) => {
    if (value) {
      result.set(interpreterIds[index], JSON.parse(value));
    }
  });

  return result;
}

/**
 * 통역사의 위치 정보 삭제 (로그아웃 시)
 */
export async function deleteInterpreterLocation(
  interpreterId: string
): Promise<void> {
  const client = await getRedisClient();
  const key = `${LOCATION_KEY_PREFIX}${interpreterId}`;

  await client.del(key);
}
