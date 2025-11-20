# TourLICA-AI

Next.js + React 기반의 반응형 스타터 프로젝트입니다. 모바일과 웹에서 일관된 여행 추천 경험을 구축할 수 있도록 app router, TypeScript, PostgreSQL, Kafka, Google Maps 샘플을 제공합니다.

## 시작하기

```bash
npm install
cp .env.example .env.local  # Postgres/Kafka/Maps 설정 입력
npm run seed:postgres       # Postgres에 샘플 데이터 업로드
npm run dev                 # http://localhost:3000
# Kafka (Redpanda) 로컬 서버 기동
docker compose up -d redpanda
# 토픽 생성 (필요 시)
./scripts/kafka-create-topic.sh
```

- `npm run dev`: 개발 모드
- `npm run build`: 프로덕션 번들 생성 (`prebuild` 단계에서 자동으로 `npm run seed:postgres` 실행)
- `npm run start`: 빌드 산출물을 실행
- `npm run lint`: ESLint 검증
- `npm run seed:postgres`: PostgreSQL에 샘플 계정/도시 데이터 업로드
- `docker compose up -d redpanda`: Kafka 호환 Redpanda 브로커 실행
- `./scripts/kafka-create-topic.sh <topic>`: 기본 토픽(`tourlica-events`) 생성

## 디렉터리

- `app/` – Next.js app router 페이지, 글로벌 스타일, 재사용 컴포넌트
- `app/api/destinations` – PostgreSQL에서 여행지 데이터를 읽어오는 API 라우트
- `app/api/events` – Kafka 이벤트 발행용 API 라우트 예시
- `app/map/` – Google Maps 기반 지도 UI 샘플
- `public/` – 파비콘 및 정적 자산
- `lib/` – PostgreSQL 클라이언트(`lib/db.ts`)와 쿼리 함수
- `configs/`, `scripts/` 등은 필요 시 추가하세요. 구조화 지침은 `AGENTS.md` 참고

Next.js 서버 컴포넌트와 API 라우트는 `pg`를 이용해 PostgreSQL 데이터를 읽습니다. `.env.local`에 `POSTGRES_URL`을 정의하고 `npm run seed:postgres` 명령으로 샘플 데이터(계정, 여행지)를 DB에 채워둘 수 있습니다.

### 환경 변수

`.env.example`를 참고해 `.env.local`을 만들고 값을 채웁니다.

```
POSTGRES_URL=
POSTGRES_HOST=6svfuf.h.filess.io
POSTGRES_PORT=5434
POSTGRES_DATABASE=tourLica_ai_blindsight
POSTGRES_USER=tourLica_ai_blindsight
POSTGRES_PASSWORD=f7ae4eea5cc93c7663a10cc39155707dfacdd037
POSTGRES_SSL=false
KAFKA_CLIENT_ID=tourlica-web
KAFKA_BROKERS=localhost:19092
KAFKA_TOPIC=tourlica-events
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBfPVL3ax4RrezJdLpIgEESJVKUgfN_9ig
```

- PostgreSQL: `POSTGRES_URL`을 비워두면 호스트/포트/DB/사용자/비밀번호 조합으로 접속합니다. SSL 지원이 필요 없으면 `POSTGRES_SSL=false`로 둡니다.
- Kafka: Redpanda 컨테이너가 `localhost:19092`에서 실행되도록 설정했습니다.
- Google Maps: JavaScript API 키를 입력하세요.

### 샘플 계정

`npm run seed:postgres` 실행 시 아래 계정이 DB에 저장됩니다.

| 역할 | 이메일 | 패스워드 |
| --- | --- | --- |
| 관광객 | traveler@tourlica.com | tour1234 |
| 통역사 | interpreter@tourlica.com | lingo123 |
| 도우미 | helper@tourlica.com | assist123 |
