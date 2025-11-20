import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let cachedDb: ReturnType<typeof getFirestore> | null = null;

function resolveEnv(key: 'FIREBASE_PROJECT_ID' | 'FIREBASE_CLIENT_EMAIL' | 'FIREBASE_PRIVATE_KEY') {
  if (key === 'FIREBASE_PROJECT_ID') {
    return process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  }
  return process.env[key];
}

export function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;
  const missing = requiredEnv.filter((key) => !resolveEnv(key));

  if (missing.length) {
    throw new Error(`Firebase 환경 변수가 누락되었습니다: ${missing.join(', ')}`);
  }

  const app = getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: resolveEnv('FIREBASE_PROJECT_ID'),
        clientEmail: resolveEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: resolveEnv('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')
      })
    });

  cachedDb = getFirestore(app);
  return cachedDb;
}
