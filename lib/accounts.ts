import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface Account {
  id: string;
  role: 'tourist' | 'interpreter' | 'helper';
  name: string;
  email: string;
  password: string;
}

export async function findAccountByCredentials(email: string, password: string): Promise<Account | undefined> {
  const q = query(
    collection(db, 'accounts'),
    where('email', '==', email),
    where('password', '==', password),
    limit(1)
  );

  const snapshot = await getDocs(q);
  const doc = snapshot.docs[0];
  if (!doc) return undefined;
  return { id: doc.id, ...(doc.data() as Omit<Account, 'id'>) };
}
