# TourLICA-AI Product Snapshot

## 현재 기능 개요
- **반응형 랜딩**: 중앙 집중 로딩 화면(커스텀 `tourlica-logo.svg`, 글로우 카드, 애니메이션 로딩바)으로 TourLICA 브랜드의 첫 인상을 제공합니다.
- **Next.js App Router 기반**: TypeScript, ESLint, `app/` 구조를 갖춘 SSR/ISR 대응 React 런타임을 구축했습니다.
- **SQLite 연동**: `scripts/db-setup.sh`로 `data/tourlica.db`를 초기화하고, `sql.js` + `lib/db.ts`/`lib/destinations.ts`가 서버 컴포넌트와 API에서 읽기 전용 쿼리를 제공합니다.
- **REST API 샘플**: `app/api/destinations`는 여행지 목록을 JSON으로, `app/api/events`는 Kafka 토픽으로 이벤트를 발행합니다.

## 인프라 & 개발 워크플로
- **Kafka/Redpanda 개발용 스택**: `docker-compose.yml`로 Single-node Redpanda를 제공하고, `scripts/kafka-create-topic.sh`로 기본 토픽(`tourlica-events`)을 생성할 수 있습니다.
- **환경 변수 가이드**: `.env.example`에 `KAFKA_*`와 `SQLITE_PATH`를 정리하여 로컬/배포 환경에서 동일한 설정 패턴을 유지합니다.
- **빌드 호환성**: `next.config.mjs`에서 `sql.js`를 외부 모듈로 선언하고 Google Fonts 의존을 제거해 오프라인 환경에서도 `npm run build`가 성공하도록 최적화했습니다.

## 향후 확장 아이디어
1. **동적 데이터 연결**: SQLite를 Supabase/Neon 등托管형 DB로 교체하면 Vercel 등 서버리스 환경 배포가 단순화됩니다.
2. **Kafka 이벤트 흐름 시각화**: `/api/events` 호출 UI를 추가하고 수신 측(Worker 또는 WebSocket)에서 상태를 보여주는 대시보드를 구성하세요.
3. **테마별 온보딩 단계**: 현재 로딩 화면을 유지한 채 단계별 메시지(데이터 준비, 플랜 생성 등)를 순서대로 보여주면 에이전트 흐름을 표현할 수 있습니다.
