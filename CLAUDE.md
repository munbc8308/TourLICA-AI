# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TourLICA-AI is a Next.js 14 App Router application for matching foreign tourists with interpreters/helpers in Korea. The stack includes:
- **Frontend**: React 18 + TypeScript, Google Maps integration
- **Backend**: Next.js API Routes (REST endpoints)
- **Database**: PostgreSQL with `pg` driver
- **Messaging**: Kafka (Redpanda for local development)
- **Key Features**: Location-based matching, real-time event streaming, multilingual support (planned)

## Essential Commands

### Setup and Development
```bash
npm install
cp .env.example .env.local           # Configure Postgres, Kafka, Google Maps
npm run seed:postgres                # Seed PostgreSQL with sample accounts/destinations
npm run dev                          # Start dev server at http://localhost:3000
```

### Kafka/Redpanda (Required for event routes)
```bash
docker compose up -d redpanda        # Start Redpanda broker (localhost:19092)
./scripts/kafka-create-topic.sh     # Create default topic (tourlica-events)
docker compose down                  # Stop all services
```

### Build and Quality Checks
```bash
npm run lint                         # ESLint validation
npm run build                        # Production build (auto-runs seed:postgres in prebuild)
npm run start                        # Run production build
```

### Testing Single Files
No automated test suite configured yet. For manual testing:
- Type checking: `npx tsc --noEmit`
- Single file lint: `npx eslint path/to/file.ts`

## Architecture and Data Flow

### PostgreSQL Connection Pattern
- **Connection pool**: `lib/db.ts` exports a singleton `pool` and `query()` helper
- **Schema support**: Set `POSTGRES_SCHEMA` in `.env.local` to use custom schema (automatically sets search_path)
- **Query helpers**: Domain-specific functions in `lib/accounts.ts` and `lib/destinations.ts`
- **Usage in API routes**: Import query helpers directly, e.g., `import { getDestinations } from '@/lib/destinations'`

### Kafka Event Publishing
- **Producer singleton**: `lib/kafka.ts` maintains a single connected producer instance
- **Publishing pattern**: API routes call `getKafkaProducer()` then `send()` messages
- **Topic**: Configured via `KAFKA_TOPIC` env var (default: `tourlica-events`)
- **Example**: `app/api/events/route.ts` shows POST endpoint that publishes JSON events

### Page Routing Structure
- `/` (app/page.tsx): Landing page with logo animation, auto-redirects to `/login` after 3.2s
- `/login` (app/login/page.tsx): Login form with social OAuth placeholders
- `/map` (app/map/page.tsx): Google Maps view showing user location + nearby interpreters (planned)
- API routes in `app/api/`:
  - `POST /api/events` - Publish events to Kafka
  - `GET /api/destinations` - Fetch destination list from PostgreSQL
  - `POST /api/auth/login` - Authentication endpoint

### Component Organization
- `app/components/` contains reusable UI components (e.g., FeatureCard)
- Client components must use `'use client'` directive
- Server components can directly import and call `lib/` query functions

## Key Technical Patterns

### TypeScript Path Alias
`@/*` resolves to project root (configured in tsconfig.json). Use for imports:
```typescript
import { query } from '@/lib/db';
import FeatureCard from '@/app/components/FeatureCard';
```

### Environment Variables
- **Server-only**: `POSTGRES_*`, `KAFKA_*` (never expose to client)
- **Client-accessible**: Prefix with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **PostgreSQL**: Can use `POSTGRES_URL` connection string OR individual `POSTGRES_HOST/PORT/DATABASE/USER/PASSWORD` vars
- **SSL/Schema**: Set `POSTGRES_SSL=false` to disable SSL, `POSTGRES_SCHEMA=public` for custom schema

### Google Maps Integration
- Uses `@react-google-maps/api` wrapper around Google Maps JavaScript API
- `useJsApiLoader()` hook loads API with key from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Geolocation fallback: Defaults to Seoul City Hall (37.5665, 126.978) if browser location unavailable

### Sample Data Seeding
- `npm run seed:postgres` executes `scripts/seed-postgres.cjs`
- Creates `accounts` table with 3 roles: tourist, interpreter, helper
- Creates `destinations` table with sample Korean cities
- Safe to run multiple times (uses `IF NOT EXISTS`)

## Location-Based Matching Flow (Implementation Roadmap)

This is the planned architecture described in PRODUCT.md:

1. **User Location Capture**: Browser geolocation API or manual input captures tourist's current/desired location
2. **Radius Configuration**: Tourist sets preferred search radius (2km, 5km, etc.)
3. **Query Nearby Interpreters**: PostgreSQL queries with PostGIS or distance calculation to find interpreters within radius
4. **Kafka Event Dispatch**: Publish match request event to `tourlica-events` topic with tourist location + preferences
5. **Interpreter Notification**: Interpreter portal (separate consumer) subscribes to topic and displays match requests
6. **Acceptance Flow**: Interpreter accepts/rejects via separate endpoint, updates PostgreSQL match status

## Coding Conventions

### File Structure
- **API Routes**: `app/api/[feature]/route.ts` with named exports (GET, POST, etc.)
- **Query Helpers**: `lib/[domain].ts` with typed interfaces and async query functions
- **Components**: `app/components/[ComponentName].tsx` with default export

### Database Queries
- Always use parameterized queries: `query('SELECT * FROM table WHERE id = $1', [id])`
- Define TypeScript interfaces for row types
- Use `lib/db.ts` query() function which handles connection pooling and schema setup

### Kafka Events
- Always add timestamp to events: `{ ...payload, ts: Date.now() }`
- Use structured JSON with clear event types (e.g., `{ type: 'match_request', ... }`)
- Handle producer connection errors gracefully

### Styling
- Global styles in `app/globals.css`
- CSS class naming follows BEM-like convention (e.g., `landing-inner`, `loading-bar__fill`)

## Important Gotchas

### PostgreSQL Schema Configuration
The `lib/db.ts` module handles schema setup in two ways:
1. Connection string option: `-c search_path=<schema>` (for initial connection)
2. Per-query `SET search_path`: Ensures schema is set even when connection pooling reuses clients

Always set `POSTGRES_SCHEMA` in `.env.local` if using non-public schema.

### Kafka Producer Lifecycle
- Producer connects lazily on first `getKafkaProducer()` call
- Connection persists across requests (singleton pattern)
- In production, consider adding graceful shutdown hook to disconnect producer

### Google Maps API Key
- Must enable "Maps JavaScript API" in Google Cloud Console
- Add localhost + production domains to API key restrictions
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (exposed to browser)

### Next.js App Router Rendering
- Server Components (default): Can use async/await, directly query database
- Client Components (`'use client'`): Required for hooks, browser APIs, event handlers
- API Routes run server-side only, suitable for sensitive operations

## Security Notes

- Never commit `.env`, `.env.local` files (already in .gitignore)
- PostgreSQL passwords should use connection pooling limits and strong credentials
- Sample accounts in seed script use plaintext passwords (acceptable for dev, hash in production)
- Kafka events may contain PII - consider tokenization before publishing
- Google Maps API key should be restricted by HTTP referrer in production