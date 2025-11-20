import { queryAll } from './db';

export interface Account {
  id: number;
  role: 'tourist' | 'interpreter' | 'helper';
  name: string;
  email: string;
  password: string;
}

export async function findAccountByCredentials(email: string, password: string): Promise<Account | undefined> {
  const result = await queryAll<Account>('SELECT * FROM accounts WHERE email = ? AND password = ?', [email, password]);
  return result[0];
}
