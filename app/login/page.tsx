'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

const socials = [
  { label: 'Google', provider: 'google' },
  { label: 'Apple', provider: 'apple' },
  { label: 'Kakao', provider: 'kakao' },
  { label: 'Naver', provider: 'naver' }
];

const demoAccounts = [
  { role: 'tourist', email: 'traveler@tourlica.com', password: 'tour1234' },
  { role: 'interpreter', email: 'interpreter@tourlica.com', password: 'lingo123' },
  { role: 'helper', email: 'helper@tourlica.com', password: 'assist123' },
  { role: 'admin', email: 'admin@tourlica.com', password: 'control123' }
];

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('Auth');
  const tCommon = useTranslations('Common');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      setError(tCommon('error'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? t('loginFailed'));
      }

      if (!data?.account) {
        throw new Error(tCommon('error'));
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tourlica.account', JSON.stringify(data.account));
        // Force reload to apply language change from new session
        window.location.href = data.account.role === 'admin' ? '/admin' : '/map';
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginFailed'));
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login-card" aria-live="polite">
        <header>
          <p className="eyebrow">Agent Console Access</p>
          <h1>{t('login')}</h1>
          <p>{tCommon('appName')}</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>{t('email')}</span>
            <input type="email" name="email" placeholder="name@example.com" autoComplete="username" required />
          </label>
          <label>
            <span>{t('password')}</span>
            <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? tCommon('loading') : t('login')}
          </button>
        </form>
        <div className="login-links">
          <Link href="/signup">{t('signup')}</Link>
          <Link href="#reset">{t('password')}?</Link>
        </div>
        <div className="divider">
          <span>OR</span>
        </div>
        <div className="social-grid">
          {socials.map((social) => (
            <button key={social.provider} type="button" className={`social-btn ${social.provider}`}>
              {social.label}
            </button>
          ))}
        </div>
        <div className="demo-accounts">
          <p>Demo Accounts</p>
          <ul>
            {demoAccounts.map((acct) => (
              <li key={acct.email}>
                <strong>{t(acct.role)}</strong>: {acct.email} / {acct.password}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
