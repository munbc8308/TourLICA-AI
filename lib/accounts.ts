import { query } from './db';

export interface Account {
  id: number;
  role: 'tourist' | 'interpreter' | 'helper';
  name: string;
  email: string;
  password: string;
}

export async function findAccountByCredentials(email: string, password: string): Promise<Account | undefined> {
  const rows = await query<Account>(
    'SELECT id, role, name, email, password FROM accounts WHERE email = $1 AND password = $2 LIMIT 1',
    [email, password]
  );

  return rows[0];
}
