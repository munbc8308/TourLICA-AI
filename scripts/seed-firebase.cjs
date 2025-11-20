#!/usr/bin/env node
const admin = require('firebase-admin');

const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Firebase 시드를 건너뜁니다. 환경 변수 부족: ${missing.join(', ')}`);
  process.exit(0);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function seedAccounts() {
  const accounts = [
    { role: 'tourist', name: 'Liam Traveler', email: 'traveler@tourlica.com', password: 'tour1234' },
    { role: 'interpreter', name: 'Jiyoon Choi', email: 'interpreter@tourlica.com', password: 'lingo123' },
    { role: 'helper', name: 'Minho Park', email: 'helper@tourlica.com', password: 'assist123' }
  ];

  const batch = db.batch();
  accounts.forEach((acct) => {
    const ref = db.collection('accounts').doc(acct.email);
    batch.set(ref, acct);
  });
  await batch.commit();
}

async function seedDestinations() {
  const destinations = [
    { city: '서울', country: '대한민국', summary: '미식과 야간 문화를 모두 즐길 수 있는 초현대적 도시', best_season: '봄/가을', highlights: '야시장, 한강 피크닉, K-Pop 쇼케이스' },
    { city: '도쿄', country: '일본', summary: '전통과 미래적 풍경이 공존하는 메트로폴리스', best_season: '봄/가을', highlights: '스시 투어, 애니메이션 투어, 신주쿠 네온' },
    { city: '파리', country: '프랑스', summary: '예술과 카페 문화가 넘치는 낭만 여행지', best_season: '봄', highlights: '루브르, 세느강 크루즈, 파티세리 투어' }
  ];

  const batch = db.batch();
  destinations.forEach((dest) => {
    const ref = db.collection('destinations').doc(`${dest.city}-${dest.country}`);
    batch.set(ref, dest);
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
    console.error('Firebase 시드 중 오류가 발생했습니다:', error.message);
    process.exit(1);
  }
})();
