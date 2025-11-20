import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __tourlica_pg_pool__: Pool | undefined;
}

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL 환경 변수를 설정하세요.');
}

export const pool = global.__tourlica_pg_pool__ ?? new Pool({ connectionString });

if (!global.__tourlica_pg_pool__) {
  global.__tourlica_pg_pool__ = pool;
}

export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}
