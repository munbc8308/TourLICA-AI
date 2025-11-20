#!/usr/bin/env node
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn('POSTGRES_URL가 설정되지 않아 Postgres 시드를 건너뜁니다.');
  process.exit(0);
}

const pool = new Pool({ connectionString });

const schemaSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('tourist', 'interpreter', 'helper')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  summary TEXT NOT NULL,
  best_season TEXT NOT NULL,
  highlights TEXT NOT NULL,
  CONSTRAINT destinations_city_country UNIQUE (city, country)
);
`;

const accountInserts = [
  { role: 'tourist', name: 'Liam Traveler', email: 'traveler@tourlica.com', password: 'tour1234' },
  { role: 'interpreter', name: 'Jiyoon Choi', email: 'interpreter@tourlica.com', password: 'lingo123' },
  { role: 'helper', name: 'Minho Park', email: 'helper@tourlica.com', password: 'assist123' }
];

const destinationInserts = [
  { city: '서울', country: '대한민국', summary: '미식과 야간 문화를 모두 즐길 수 있는 초현대적 도시', best_season: '봄/가을', highlights: '야시장, 한강 피크닉, K-Pop 쇼케이스' },
  { city: '도쿄', country: '일본', summary: '전통과 미래적 풍경이 공존하는 메트로폴리스', best_season: '봄/가을', highlights: '스시 투어, 애니메이션 투어, 신주쿠 네온' },
  { city: '파리', country: '프랑스', summary: '예술과 카페 문화가 넘치는 낭만 여행지', best_season: '봄', highlights: '루브르, 세느강 크루즈, 파티세리 투어' }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    await Promise.all(
      accountInserts.map((acct) =>
        client.query(
          `INSERT INTO accounts (role, name, email, password) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name, password = EXCLUDED.password`,
          [acct.role, acct.name, acct.email, acct.password]
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
