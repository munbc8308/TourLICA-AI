# 통역사 실시간 위치 추적 시스템

## 아키텍처 개요

```
통역사 앱 → POST /api/interpreter/location (위치 업데이트)
                ↓
         Kafka Producer (key: interpreterId)
                ↓
    Topic: interpreter-location-updates
         /          |          \
    Partition 0  Partition 1  Partition 2
         ↓          ↓          ↓
    [Kafka Consumer: location-to-redis-processor]
         ↓
    Redis (최신 위치 캐싱, TTL: 1시간)
         ↓
    관광객 앱 → GET /api/interpreter/{id}/location
```

## 핵심 설계 원칙

### 1. 단일 토픽 + 파티션 키 전략
- ✅ **토픽**: `interpreter-location-updates` (모든 통역사 공용)
- ✅ **파티션 키**: `interpreterId` (같은 통역사는 같은 파티션으로 전송)
- ✅ **순서 보장**: 같은 파티션 내에서 메시지 순서 보장
- ❌ **안티패턴**: 통역사마다 별도 토픽 생성 (토픽 폭발 문제)

### 2. 3-Tier 데이터 계층
1. **Kafka**: 실시간 이벤트 스트림 (단기 보관)
2. **Redis**: 최신 위치 캐싱 (빠른 조회, TTL 1시간)
3. **PostgreSQL**: 위치 이력 장기 보관 (미구현 - 필요 시 배치 저장)

### 3. 파티션 키의 작동 원리
```typescript
// 같은 interpreterId는 항상 같은 파티션으로 라우팅
interpreterId: "user-123" → hash("user-123") % 3 = 파티션 0
interpreterId: "user-456" → hash("user-456") % 3 = 파티션 1
interpreterId: "user-789" → hash("user-789") % 3 = 파티션 2
```

## 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

필요한 패키지:
- `redis@^4.7.0`: Redis 클라이언트
- `kafkajs@2.2.4`: Kafka 클라이언트
- `tsx@^4.19.2`: TypeScript 실행 도구 (consumer 실행용)

### 2. 환경 변수 설정 (.env.local)
```bash
# Kafka 설정
KAFKA_LOCATION_TOPIC=interpreter-location-updates
KAFKA_LOCATION_CONSUMER_GROUP=location-to-redis-processor

# Redis 설정
REDIS_URL=redis://localhost:6379
```

### 3. 인프라 시작

#### Redis 시작 (Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Kafka 토픽 생성
```bash
# Redpanda 사용 시
./scripts/kafka-create-topic.sh interpreter-location-updates

# Confluent Cloud 사용 시 (웹 UI에서 수동 생성)
# Topic: interpreter-location-updates
# Partitions: 3 (통역사 수에 따라 조정)
```

### 4. Consumer 실행
```bash
npx tsx services/location-consumer.ts
```

출력 예시:
```
🚀 Starting location consumer...
✅ Kafka consumer connected
✅ Subscribed to topic: interpreter-location-updates
📍 [Partition 0] Updated location for interpreter: user-123 (37.5665, 126.978)
```

## API 사용법

### 1. 위치 업데이트 (통역사 앱)

**Endpoint**: `POST /api/interpreter/location`

**Request Body**:
```json
{
  "interpreterId": "user-123",
  "latitude": 37.5665,
  "longitude": 126.978,
  "accuracy": 10,       // 선택: GPS 정확도 (미터)
  "heading": 180,       // 선택: 이동 방향 (0-359도)
  "speed": 1.5          // 선택: 속도 (m/s)
}
```

**Response**:
```json
{
  "success": true,
  "interpreterId": "user-123",
  "timestamp": 1732780800000
}
```

**사용 예시 (통역사 앱)**:
```typescript
// 30초마다 위치 업데이트
setInterval(async () => {
  const position = await getCurrentPosition();

  await fetch('/api/interpreter/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interpreterId: currentUser.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    })
  });
}, 30000);
```

### 2. 단일 통역사 위치 조회 (관광객 앱)

**Endpoint**: `GET /api/interpreter/{id}/location`

**Response**:
```json
{
  "interpreterId": "user-123",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.978,
    "accuracy": 10,
    "heading": 180,
    "speed": 1.5
  },
  "timestamp": 1732780800000,
  "updatedAt": "2024-11-28T10:00:00.000Z",
  "ageMinutes": 0.5,
  "isStale": false
}
```

**Error (위치 없음)**:
```json
{
  "error": "Location not found",
  "message": "Interpreter location is not available or has expired"
}
```

### 3. 여러 통역사 위치 조회 (지도 표시)

**Endpoint**: `GET /api/interpreter/locations?ids=user1,user2,user3`

**Response**:
```json
{
  "count": 2,
  "requested": 3,
  "locations": [
    {
      "interpreterId": "user1",
      "location": { "latitude": 37.5665, "longitude": 126.978 },
      "timestamp": 1732780800000,
      "updatedAt": "2024-11-28T10:00:00.000Z"
    },
    {
      "interpreterId": "user2",
      "location": { "latitude": 37.5700, "longitude": 126.980 },
      "timestamp": 1732780850000,
      "updatedAt": "2024-11-28T10:00:50.000Z"
    }
  ]
}
```

**사용 예시 (관광객 앱)**:
```typescript
// 매칭된 통역사들의 위치를 5초마다 업데이트
setInterval(async () => {
  const interpreterIds = matchedInterpreters.map(i => i.id).join(',');

  const res = await fetch(`/api/interpreter/locations?ids=${interpreterIds}`);
  const data = await res.json();

  data.locations.forEach(loc => {
    updateMapMarker(loc.interpreterId, loc.location);
  });
}, 5000);
```

## 성능 특성

### 처리량
- **Kafka**: 파티션당 초당 수천 건 처리 가능
- **Redis**: 단일 인스턴스 초당 10만 ops 이상
- **API**: 위치 조회는 Redis에서 1ms 이내 응답

### 확장성
- **수평 확장**: Consumer Group으로 consumer 인스턴스 추가
- **파티션 증가**: 통역사 수 증가 시 토픽 파티션 증가
- **Redis 클러스터**: 필요 시 Redis Cluster로 전환

### 데이터 보관
- **Kafka**: 기본 7일 (retention 정책 조정 가능)
- **Redis**: TTL 1시간 (위치 업데이트가 없으면 자동 삭제)
- **PostgreSQL**: 미구현 (필요 시 배치 저장 구현)

## 운영 가이드

### Consumer 모니터링
```bash
# Consumer 로그 확인
npx tsx services/location-consumer.ts

# 예상 출력
📍 [Partition 0] Updated location for interpreter: user-123
📍 [Partition 1] Updated location for interpreter: user-456
```

### Redis 데이터 확인
```bash
redis-cli
> KEYS interpreter:location:*
> GET interpreter:location:user-123
```

### 장애 대응

#### Consumer 다운 시
- Kafka는 메시지 보관 (retention 기간 내)
- Consumer 재시작 시 자동으로 마지막 커밋 위치부터 재개
- 새로운 위치 업데이트만 Redis에 반영 (과거 메시지는 무시)

#### Redis 다운 시
- 위치 조회 API는 404 반환
- Consumer는 Redis 재연결 자동 시도 (최대 10회)
- Redis 복구 시 새 위치부터 다시 캐싱

#### Kafka 다운 시
- 위치 업데이트 API는 500 에러 반환
- Redis 캐시는 TTL까지 유지 (최대 1시간)
- Kafka 복구 시 정상 동작

## 향후 개선 사항

### 1. PostgreSQL 이력 저장
```typescript
// Consumer에서 배치 저장 (5분마다)
const locationBuffer = [];

setInterval(async () => {
  if (locationBuffer.length > 0) {
    await bulkInsertToPostgres(locationBuffer);
    locationBuffer.length = 0;
  }
}, 300000);
```

### 2. WebSocket 실시간 푸시
```typescript
// Consumer에서 WebSocket으로 관광객에게 직접 전송
io.to(`tourist-${touristId}`).emit('interpreter-location', {
  interpreterId,
  location
});
```

### 3. 지오펜싱 알림
```typescript
// 통역사가 관광객 근처(100m)에 도착 시 알림
if (distance(interpreter, tourist) < 100) {
  sendPushNotification(touristId, '통역사가 곧 도착합니다!');
}
```

## 트러블슈팅

### "Redis connection refused"
```bash
# Redis가 실행 중인지 확인
docker ps | grep redis

# Redis 시작
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### "Kafka topic not found"
```bash
# 토픽 생성 (Redpanda)
rpk topic create interpreter-location-updates --brokers localhost:19092

# 토픽 목록 확인
rpk topic list --brokers localhost:19092
```

### "Consumer not processing messages"
1. Consumer 로그 확인: `npx tsx services/location-consumer.ts`
2. 토픽에 메시지가 들어오는지 확인: `rpk topic consume interpreter-location-updates`
3. Consumer Group 상태 확인: `rpk group describe location-to-redis-processor`

## 참고 자료

- [KafkaJS 공식 문서](https://kafka.js.org/)
- [Redis Node 클라이언트](https://github.com/redis/node-redis)
- [Kafka 파티션 전략](https://kafka.apache.org/documentation/#producerconfigs_partitioner.class)
