#!/usr/bin/env node
const { getApps, initializeApp } = require('firebase/app');
const { doc, getFirestore, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (Object.values(firebaseConfig).some((value) => !value)) {
  console.warn('Firebase 시드를 건너뜁니다. 환경 변수를 모두 설정하세요.');
  process.exit(0);
}

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedAccounts() {
  const accounts = [
    { role: 'tourist', name: 'Liam Traveler', email: 'traveler@tourlica.com', password: 'tour1234' },
    { role: 'interpreter', name: 'Jiyoon Choi', email: 'interpreter@tourlica.com', password: 'lingo123' },
    { role: 'helper', name: 'Minho Park', email: 'helper@tourlica.com', password: 'assist123' }
  ];
  const batch = writeBatch(db);
  accounts.forEach((acct) => {
    batch.set(doc(db, 'accounts', acct.email), acct, { merge: true });
  });
  await batch.commit();
}

async function seedDestinations() {
  const destinations = [
    { city: '서울', country: '대한민국', summary: '미식과 야간 문화를 모두 즐길 수 있는 초현대적 도시', best_season: '봄/가을', highlights: '야시장, 한강 피크닉, K-Pop 쇼케이스' },
    { city: '도쿄', country: '일본', summary: '전통과 미래적 풍경이 공존하는 메트로폴리스', best_season: '봄/가을', highlights: '스시 투어, 애니메이션 투어, 신주쿠 네온' },
    { city: '파리', country: '프랑스', summary: '예술과 카페 문화가 넘치는 낭만 여행지', best_season: '봄', highlights: '루브르, 세느강 크루즈, 파티세리 투어' }
  ];
  const batch = writeBatch(db);
  destinations.forEach((dest) => {
    batch.set(doc(db, 'destinations', `${dest.city}-${dest.country}`), dest, { merge: true });
  });
  await batch.commit();
}

(async () => {
  try {
    await seedAccounts();
    await seedDestinations();
    console.log('Firebase 샘플 데이터가 준비되었습니다.');
    process.exit(0);
  } catch (error) {
    console.error('Firebase 시드 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
})();
