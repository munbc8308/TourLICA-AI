'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('Landing');
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
          <Image src="/tourLICA.png" alt={t('logoAlt')} width={220} height={220} priority />
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>TourLICA</h1>
          <p className="tagline">{t('tagline')}</p>
        </div>
        <div className="loading-area" role="status" aria-live="polite">
          <div className="loading-bar">
            <span className="loading-bar__fill" />
          </div>
          <p>{t('loading')}</p>
        </div>
      </div>
    </main>
  );
}
