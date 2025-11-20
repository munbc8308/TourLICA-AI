import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database } from 'sql.js';

const dbPath = process.env.SQLITE_PATH ?? path.join(process.cwd(), 'data', 'tourlica.db');
let dbInstance: Promise<Database> | null = null;

async function loadDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file) => path.join(process.cwd(), 'node_modules/sql.js/dist', file)
      });
      if (!fs.existsSync(dbPath)) {
        throw new Error(`SQLite 데이터베이스를 찾을 수 없습니다: ${dbPath}. npm run db:setup 을 먼저 실행하세요.`);
      }
      const fileBuffer = fs.readFileSync(dbPath);
      return new SQL.Database(fileBuffer);
    })();
  }
  return dbInstance;
}

export async function queryAll<T>(sql: string, params: (string | number)[] = []) {
  const db = await loadDatabase();
  const stmt = db.prepare(sql);
  if (params.length) {
    stmt.bind(params);
  }

  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}
