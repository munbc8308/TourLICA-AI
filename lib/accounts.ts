import { getDb } from './firebaseAdmin';

export interface Account {
  id: string;
  role: 'tourist' | 'interpreter' | 'helper';
  name: string;
  email: string;
  password: string;
}

export async function findAccountByCredentials(email: string, password: string): Promise<Account | undefined> {
  const firestore = getDb();
  const snapshot = await firestore
    .collection('accounts')
    .where('email', '==', email)
    .where('password', '==', password)
    .limit(1)
    .get();

  const doc = snapshot.docs[0];
  if (!doc) return undefined;
  return { id: doc.id, ...(doc.data() as Omit<Account, 'id'>) };
}
