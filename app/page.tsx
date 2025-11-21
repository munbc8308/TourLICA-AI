'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="landing">
      <div className="landing-inner">
        <div className="logo-stack">
          <div className="logo-glow" />
          <Image src="/tourLICA.png" alt="TourLICA 로고" width={220} height={220} priority />
          <p className="eyebrow">Tour Logistics & Conversational Agent</p>
          <h1>TourLICA</h1>
          <p className="tagline">유연한 여행 에이전트를 위한 초기 부팅 화면</p>
        </div>
        <div className="loading-area" role="status" aria-live="polite">
          <div className="loading-bar">
            <span className="loading-bar__fill" />
          </div>
          <p>맞춤 여정 데이터를 불러오는 중...</p>
        </div>
      </div>
    </main>
  );
}
