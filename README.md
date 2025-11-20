# TourLICA-AI

Next.js + React 기반의 반응형 스타터 프로젝트입니다. 모바일과 웹에서 일관된 여행 추천 경험을 구축할 수 있도록 app router, TypeScript, Firebase, Kafka, Google Maps 샘플을 제공합니다.

## 시작하기

```bash
npm install
cp .env.example .env.local  # Firebase/Kafka/Maps 설정 입력
npm run seed:firebase       # Firebase에 샘플 데이터 업로드
npm run dev                 # http://localhost:3000
# Kafka (Redpanda) 로컬 서버 기동
docker compose up -d redpanda
# 토픽 생성 (필요 시)
./scripts/kafka-create-topic.sh
```

- `npm run dev`: 개발 모드
- `npm run build`: 프로덕션 번들 생성 (`prebuild` 단계에서 자동으로 `npm run seed:firebase` 실행)
- `npm run start`: 빌드 산출물을 실행
- `npm run lint`: ESLint 검증
- `npm run seed:firebase`: Firebase Firestore에 샘플 계정/도시 데이터 업로드
- `docker compose up -d redpanda`: Kafka 호환 Redpanda 브로커 실행
- `./scripts/kafka-create-topic.sh <topic>`: 기본 토픽(`tourlica-events`) 생성

## 디렉터리

- `app/` – Next.js app router 페이지, 글로벌 스타일, 재사용 컴포넌트
- `app/api/destinations` – Firebase Firestore에서 여행지 데이터를 읽어오는 API 라우트
- `app/api/events` – Kafka 이벤트 발행용 API 라우트 예시
- `app/map/` – Google Maps 기반 지도 UI 샘플
- `public/` – 파비콘 및 정적 자산
- `lib/` – 데이터베이스 클라이언트 및 쿼리 함수
- `data/sql/` – 스키마와 기본 시드 SQL 스크립트
- `configs/`, `scripts/` 등은 필요 시 추가하세요. 구조화 지침은 `AGENTS.md` 참고

Next.js 서버 컴포넌트와 API 라우트는 Firebase Web SDK를 이용해 Firestore 데이터를 읽습니다. `.env.local`에 Firebase 웹 앱 설정을 입력하고 `npm run seed:firebase` 명령으로 샘플 데이터(계정, 여행지)를 Firestore에 채워둘 수 있습니다.

### 환경 변수

`.env.example`를 참고해 `.env.local`을 만들고 값을 채웁니다.

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC56nnm68wC60MaO7yH5VojfXQ9g24ECmI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=troulica-27b49.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=troulica-27b49
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=troulica-27b49.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=155238464760
NEXT_PUBLIC_FIREBASE_APP_ID=1:155238464760:web:f0fdea2ee7af1c0c7dcf0d
KAFKA_CLIENT_ID=tourlica-web
KAFKA_BROKERS=localhost:19092
KAFKA_TOPIC=tourlica-events
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBfPVL3ax4RrezJdLpIgEESJVKUgfN_9ig
```

- Firebase: 콘솔에서 웹 앱 구성을 확인하고 위 값으로 복사하세요.
- Kafka: Redpanda 컨테이너가 `localhost:19092`에서 실행되도록 설정했습니다.
- Google Maps: JavaScript API 키를 입력하세요.

### 샘플 계정

`npm run seed:firebase` 실행 시 아래 계정이 Firestore에 저장됩니다.

| 역할 | 이메일 | 패스워드 |
| --- | --- | --- |
| 관광객 | traveler@tourlica.com | tour1234 |
| 통역사 | interpreter@tourlica.com | lingo123 |
| 도우미 | helper@tourlica.com | assist123 |
