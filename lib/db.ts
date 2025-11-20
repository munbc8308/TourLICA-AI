import { Pool, PoolConfig, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __tourlica_pg_pool__: Pool | undefined;
}

function buildConfig(): PoolConfig {
  if (process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim().length > 0) {
    return { connectionString: process.env.POSTGRES_URL };
  }

  const required = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD'] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`PostgreSQL 환경 변수가 누락되었습니다: ${missing.join(', ')}`);
  }

  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: parseSsl(),
    options: parseSearchPathOption()
  };
}

function parseSsl(): PoolConfig['ssl'] {
  const value = process.env.POSTGRES_SSL?.toLowerCase();
  if (!value || value === 'false' || value === '0' || value === 'off') {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

function parseSearchPathOption(): string | undefined {
  const schema = process.env.POSTGRES_SCHEMA?.trim();
  if (!schema) return undefined;
  return `-c search_path="${schema}"`;
}

export const pool = global.__tourlica_pg_pool__ ?? new Pool(buildConfig());

if (!global.__tourlica_pg_pool__) {
  global.__tourlica_pg_pool__ = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    await ensureSearchPath(client);
    const result = await client.query<T>(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function ensureSearchPath(client: any) {
  const schema = process.env.POSTGRES_SCHEMA?.trim();
  if (!schema || client.__tourlica_schema_set__) {
    return;
  }
  await client.query(`SET search_path TO "${schema}"`);
  client.__tourlica_schema_set__ = true;
}
