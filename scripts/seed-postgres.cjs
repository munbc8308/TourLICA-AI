#!/usr/bin/env node
const path = require('node:path');
const { config } = require('dotenv');
const { Pool } = require('pg');

config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function buildConfig() {
  if (process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim().length > 0) {
    return { connectionString: process.env.POSTGRES_URL };
  }

  const required = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.warn(`Postgres 시드를 건너뜁니다. 환경 변수 누락: ${missing.join(', ')}`);
    process.exit(0);
  }

  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: parseSsl()
  };
}

const pool = new Pool(buildConfig());

function parseSsl() {
  const value = process.env.POSTGRES_SSL?.toLowerCase();
  if (!value || value === 'false' || value === '0' || value === 'off') {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

function getSchemaSql(schema) {
  return `
CREATE TABLE IF NOT EXISTS "${schema}".accounts (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('tourist', 'interpreter', 'helper', 'admin')),
  name TEXT NOT NULL,
  nickname TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  country TEXT,
  device_fingerprint TEXT,
  interpreter_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema}".destinations (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  summary TEXT NOT NULL,
  best_season TEXT NOT NULL,
  highlights TEXT NOT NULL,
  CONSTRAINT destinations_city_country UNIQUE (city, country)
);

CREATE TABLE IF NOT EXISTS "${schema}".match_requests (
  id SERIAL PRIMARY KEY,
  requester_account_id INTEGER REFERENCES "${schema}".accounts(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('tourist')),
  target_role TEXT NOT NULL CHECK (target_role IN ('interpreter', 'helper')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_km INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'cancelled', 'matched')) DEFAULT 'pending',
  device TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_requests_target_role_idx
  ON "${schema}".match_requests (target_role, status, created_at DESC);

CREATE TABLE IF NOT EXISTS "${schema}".match_assignments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES "${schema}".match_requests(id) ON DELETE SET NULL,
  tourist_account_id INTEGER REFERENCES "${schema}".accounts(id) ON DELETE SET NULL,
  responder_account_id INTEGER REFERENCES "${schema}".accounts(id) ON DELETE SET NULL,
  responder_role TEXT NOT NULL CHECK (responder_role IN ('interpreter', 'helper')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "${schema}".match_movements (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES "${schema}".match_assignments(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tourist', 'interpreter', 'helper')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_movements_assignment_idx
  ON "${schema}".match_movements (assignment_id, recorded_at DESC);
`;
}

const accountInserts = [
  {
    role: 'tourist',
    name: 'Liam Traveler',
    nickname: 'Liam',
    email: 'traveler@tourlica.com',
    password: 'tour1234',
    phone: '+82-10-1234-1234',
    gender: 'male',
    country: 'United States',
    device_fingerprint: 'seed-device-tourist'
  },
  {
    role: 'interpreter',
    name: 'Jiyoon Choi',
    nickname: 'Interpreter JY',
    email: 'interpreter@tourlica.com',
    password: 'lingo123',
    phone: '+82-10-9999-0000',
    gender: 'female',
    country: 'Korea',
    device_fingerprint: 'seed-device-interpreter',
    interpreter_code: 'INT-0001'
  },
  {
    role: 'helper',
    name: 'Minho Park',
    nickname: 'Field Buddy',
    email: 'helper@tourlica.com',
    password: 'assist123',
    phone: '+82-10-8888-5555',
    gender: 'male',
    country: 'Korea',
    device_fingerprint: 'seed-device-helper'
  },
  {
    role: 'admin',
    name: 'Console Admin',
    nickname: 'OPS',
    email: 'admin@tourlica.com',
    password: 'control123',
    phone: '+82-2-555-0000',
    gender: 'prefer-not-to-say',
    country: 'Korea',
    device_fingerprint: 'seed-device-admin'
  }
];

const destinationInserts = [
  { city: '서울', country: '대한민국', summary: '미식과 야간 문화를 모두 즐길 수 있는 초현대적 도시', best_season: '봄/가을', highlights: '야시장, 한강 피크닉, K-Pop 쇼케이스' },
  { city: '도쿄', country: '일본', summary: '전통과 미래적 풍경이 공존하는 메트로폴리스', best_season: '봄/가을', highlights: '스시 투어, 애니메이션 투어, 신주쿠 네온' },
  { city: '파리', country: '프랑스', summary: '예술과 카페 문화가 넘치는 낭만 여행지', best_season: '봄', highlights: '루브르, 세느강 크루즈, 파티세리 투어' }
];

async function ensureAccountTable(client, schema) {
  const table = `"${schema}".accounts`;
  const alterStatements = [
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS nickname TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS phone TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS gender TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS country TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS device_fingerprint TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS interpreter_code TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`
  ];

  for (const statement of alterStatements) {
    await client.query(statement);
  }

  await client.query(`ALTER TABLE ${table} ALTER COLUMN created_at SET DEFAULT NOW()`);
  await client.query(`UPDATE ${table} SET created_at = NOW() WHERE created_at IS NULL`);
  await client.query(`ALTER TABLE ${table} ALTER COLUMN created_at SET NOT NULL`);

  await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS accounts_role_check`);
  await client.query(
    `ALTER TABLE ${table} ADD CONSTRAINT accounts_role_check CHECK (role IN ('tourist', 'interpreter', 'helper', 'admin'))`
  );

  await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS accounts_interpreter_code_key`);
  await client.query(`ALTER TABLE ${table} ADD CONSTRAINT accounts_interpreter_code_key UNIQUE (interpreter_code)`);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set search_path to ensure we're working in the correct schema
    const schema = process.env.POSTGRES_SCHEMA?.trim() || 'public';
    console.log(`Using schema: ${schema}`);

    // Only create schema if it's not 'public'
    if (schema.toLowerCase() !== 'public') {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }

    // Always set search_path explicitly
    await client.query(`SET search_path TO "${schema}"`);

    // Create tables with explicit schema qualification
    const schemaSql = getSchemaSql(schema);
    await client.query(schemaSql);
    await ensureAccountTable(client, schema);
    await Promise.all(
      accountInserts.map((acct) =>
        client.query(
          `INSERT INTO accounts (role, name, nickname, email, password, phone, gender, country, device_fingerprint, interpreter_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (email) DO UPDATE SET
             role = EXCLUDED.role,
             name = EXCLUDED.name,
             nickname = EXCLUDED.nickname,
             password = EXCLUDED.password,
             phone = EXCLUDED.phone,
             gender = EXCLUDED.gender,
             country = EXCLUDED.country,
             device_fingerprint = EXCLUDED.device_fingerprint,
             interpreter_code = EXCLUDED.interpreter_code`,
          [
            acct.role,
            acct.name,
            acct.nickname ?? null,
            acct.email,
            acct.password,
            acct.phone ?? null,
            acct.gender ?? null,
            acct.country ?? null,
            acct.device_fingerprint ?? null,
            acct.interpreter_code ?? null
          ]
        )
      )
    );
    await Promise.all(
      destinationInserts.map((dest) =>
        client.query(
          `INSERT INTO destinations (city, country, summary, best_season, highlights)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (city, country) DO UPDATE SET
             summary = EXCLUDED.summary,
             best_season = EXCLUDED.best_season,
             highlights = EXCLUDED.highlights`,
          [dest.city, dest.country, dest.summary, dest.best_season, dest.highlights]
        )
      )
    );
    await client.query('COMMIT');
    console.log('PostgreSQL 샘플 데이터가 준비되었습니다.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('PostgreSQL 시드 중 오류가 발생했습니다:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
