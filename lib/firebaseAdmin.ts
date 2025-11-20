import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let cachedDb: ReturnType<typeof getFirestore> | null = null;

export function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const requiredEnv = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Firebase 환경 변수가 누락되었습니다: ${missing.join(', ')}`);
  }

  const app = getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });

  cachedDb = getFirestore(app);
  return cachedDb;
}
