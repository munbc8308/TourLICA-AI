# Repository Guidelines

TourLICA-AI는 Next.js App Router, Firebase, Kafka, Google Maps를 사용한 여행 에이전트 실험실입니다. 모든 기여는 기존 흐름을 망가뜨리지 않도록 작은 단위로, 충분한 설명과 함께 제출하세요.

## Project Structure & Module Organization
- `app/` – App Router 페이지, API Route Handler, 레이아웃, 글로벌 스타일. UI 변경 시 해당 경로에서 진행합니다.
- `lib/` – Firebase 클라이언트 초기화(`firebaseClient.ts`), Firestore 쿼리 헬퍼(`accounts.ts`, `destinations.ts` 등)를 둡니다.
- `public/` – 정적 자산(파비콘, 로고). 지도 마커나 일러스트 리소스도 여기에 추가하세요.
- `scripts/` – 자동화 스크립트(`seed-firebase.cjs`, `kafka-create-topic.sh`). 새 스크립트는 README에 사용법을 적습니다.

## Build, Test, and Development Commands
```bash
npm install
cp .env.example .env.local  # Firebase, Kafka, Maps 값 입력
npm run seed:firebase       # Firestore 샘플 데이터 업로드
npm run dev                 # 로컬 개발 서버 (http://localhost:3000)
npm run lint                # ESLint
npm run build               # prebuild 단계에서 seed:firebase 실행 후 빌드
```
Docker로 Redpanda를 실행해야 Kafka 라우트를 테스트할 수 있습니다.

## Coding Style & Naming Conventions
- TypeScript + React 18 (App Router). 서버 구성요소/Route Handler는 async/await 사용.
- Firebase Web SDK(`firebase/app`, `firebase/firestore`)는 `lib/firebaseClient.ts`를 통해 초기화하고, 다중 앱 생성을 피하세요.
- CSS는 `app/globals.css`에 정의하거나 CSS Modules/Styled Components를 사용하되 일관되게 작성합니다.
- 환경 변수는 `.env.local`에만 저장하고, `NEXT_PUBLIC_` 접두사를 통해 클라이언트에서 필요한 값만 노출합니다.

## Testing Guidelines
- 아직 자동 테스트 스택이 없음. 주요 변경 시 `npm run lint`, `npm run build`로 타입/빌드 확인.
- Firebase 또는 Kafka 연동 로직은 목업 데이터를 주입해 Route Handler 단위 테스트를 추가하는 것을 권장합니다.

## Commit & Pull Request Guidelines
- Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`)를 사용합니다.
- PR에는 변경된 UI(스크린샷/짧은 설명), 관련 명령어, 필요한 환경 변수 변화를 포함하세요.
- Firebase/Kafka 설정을 수정하면 `.env.example`, README, PRODUCT.md 등을 함께 업데이트하십시오.

## Security & Configuration Tips
- Firebase API 키, Maps API 키, Kafka 인증 정보는 절대 커밋하지 않습니다.
- Firestore는 최소 권한 원칙으로 구성하고, 민감 데이터는 암호화/마스킹하세요.
- Kafka 이벤트에는 PII를 포함하지 말고, 필요 시 토큰화된 식별자만 전달하세요.
