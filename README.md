# TourLICA-AI

Next.js + React 기반의 반응형 스타터 프로젝트입니다. 모바일과 웹에서 일관된 여행 추천 경험을 구축할 수 있도록 app router, TypeScript, ESLint, 기본적인 레이아웃 샘플을 제공합니다.

## 시작하기

```bash
npm install
npm run dev
# SQLite 초기화
npm run db:setup
# Kafka (Redpanda) 로컬 서버 기동
docker compose up -d redpanda
# 토픽 생성 (필요 시)
./scripts/kafka-create-topic.sh
```

- `npm run dev`: 개발 모드 (http://localhost:3000)
- `npm run build`: 프로덕션 번들 생성
- `npm run start`: 빌드 산출물을 실행
- `npm run lint`: ESLint 검증
- `npm run db:setup`: SQLite 스키마/시드 구성 (`data/tourlica.db`)
- `docker compose up -d redpanda`: Kafka 호환 Redpanda 브로커 실행
- `./scripts/kafka-create-topic.sh <topic>`: 기본 토픽(`tourlica-events`) 생성

## 디렉터리

- `app/` – Next.js app router 페이지, 글로벌 스타일, 재사용 컴포넌트
- `app/api/destinations` – SQLite 데이터 노출용 API 라우트
- `app/api/events` – Kafka 이벤트 발행용 API 라우트 예시
- `public/` – 파비콘 및 정적 자산
- `lib/` – 데이터베이스 클라이언트 및 쿼리 함수
- `data/sql/` – 스키마와 기본 시드 SQL 스크립트
- `configs/`, `scripts/` 등은 필요 시 추가하세요. 구조화 지침은 `AGENTS.md` 참고

Next.js 서버 컴포넌트와 API 라우트는 `sql.js`를 이용해 `data/tourlica.db` 파일을 메모리로 로드합니다. 다른 경로를 쓰고 싶다면 `SQLITE_PATH` 환경 변수를 지정하세요. 필요한 패키지를 추가한 뒤, 반응형 컴포넌트나 API 라우트를 `app/api/` 하위에 구성하면 됩니다.

### Kafka 환경 변수

`.env.example`를 참고해 `.env.local`을 만들고 아래 값을 조정하세요.

```
KAFKA_CLIENT_ID=tourlica-web
KAFKA_BROKERS=localhost:19092
KAFKA_TOPIC=tourlica-events
```

Redpanda 컨테이너는 `kafkajs`에서 `localhost:19092`로 접근합니다. 필요하다면 `docker-compose.yml`에서 포트를 조정하고 `.env.local`을 맞춰 주세요.
