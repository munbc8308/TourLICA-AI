'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const roles = ['tourist', 'interpreter', 'helper'] as const;

export default function SignupLandingPage() {
  const t = useTranslations('Signup');
  const tAuth = useTranslations('Auth');
  const router = useRouter();

  return (
    <main className="signup">
      <div className="signup-card">
        <header>
          <p className="eyebrow">{tAuth('chooseRole')}</p>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </header>
        <div className="role-grid">
          {roles.map((role) => (
            <article key={role} className="role-option">
              <div>
                <h2>{t(`roles.${role}.title`)}</h2>
                <p>{t(`roles.${role}.tagline`)}</p>
                <ul>
                  {[0, 1, 2].map((i) => (
                    <li key={i}>{t(`roles.${role}.bullets.${i}`)}</li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => router.push(`/signup/${role}`)}>
                {tAuth('joinAs', { role: t(`roles.${role}.title`) })}
              </button>
            </article>
          ))}
        </div>
        <p className="signup-note">
          {tAuth('alreadyHaveAccount')} <Link href="/login">{tAuth('login')}</Link>
        </p>
      </div>
    </main>
  );
}
