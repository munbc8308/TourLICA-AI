import { query } from './db';

export type AccountRole = 'tourist' | 'interpreter' | 'helper' | 'admin';

export interface Account {
  id: number;
  role: AccountRole;
  name: string;
  nickname: string | null;
  email: string;
  password: string;
  phone: string | null;
  gender: string | null;
  country: string | null;
  deviceFingerprint: string | null;
  interpreterCode: string | null;
  createdAt: string;
}

export interface NewAccount {
  role: AccountRole;
  name: string;
  nickname?: string | null;
  email: string;
  password: string;
  phone?: string | null;
  gender?: string | null;
  country?: string | null;
  deviceFingerprint?: string | null;
  interpreterCode?: string | null;
}

export async function findAccountByCredentials(email: string, password: string): Promise<Account | undefined> {
  const rows = await query<Account>(
    `SELECT
      id,
      role,
      name,
      nickname,
      email,
      password,
      phone,
      gender,
      country,
      device_fingerprint AS "deviceFingerprint",
      interpreter_code AS "interpreterCode",
      created_at AS "createdAt"
    FROM accounts
    WHERE email = $1 AND password = $2
    LIMIT 1`,
    [email, password]
  );

  return rows[0];
}

export async function findAccountById(id: number): Promise<Account | undefined> {
  const rows = await query<Account>(
    `SELECT
      id,
      role,
      name,
      nickname,
      email,
      password,
      phone,
      gender,
      country,
      device_fingerprint AS "deviceFingerprint",
      interpreter_code AS "interpreterCode",
      created_at AS "createdAt"
    FROM accounts
    WHERE id = $1
    LIMIT 1`,
    [id]
  );

  return rows[0];
}

export async function createAccount(newAccount: NewAccount): Promise<Account> {
  const rows = await query<Account>(
    `INSERT INTO accounts
      (role, name, nickname, email, password, phone, gender, country, device_fingerprint, interpreter_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING
      id,
      role,
      name,
      nickname,
      email,
      password,
      phone,
      gender,
      country,
      device_fingerprint AS "deviceFingerprint",
      interpreter_code AS "interpreterCode",
      created_at AS "createdAt"`,
    [
      newAccount.role,
      newAccount.name,
      sanitize(newAccount.nickname),
      newAccount.email,
      newAccount.password,
      sanitize(newAccount.phone),
      sanitize(newAccount.gender),
      sanitize(newAccount.country),
      sanitize(newAccount.deviceFingerprint),
      sanitize(newAccount.interpreterCode)
    ]
  );

  return rows[0];
}

function sanitize(value?: string | null): string | null {
  const trimmed = value?.toString().trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
