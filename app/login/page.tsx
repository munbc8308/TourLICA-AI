'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const socials = [
  { label: 'Google로 계속하기', provider: 'google' },
  { label: 'Apple로 계속하기', provider: 'apple' },
  { label: 'Kakao로 계속하기', provider: 'kakao' },
  { label: 'Naver로 계속하기', provider: 'naver' }
];

const demoAccounts = [
  { role: '관광객', email: 'traveler@tourlica.com', password: 'tour1234' },
  { role: '통역사', email: 'interpreter@tourlica.com', password: 'lingo123' },
  { role: '도우미', email: 'helper@tourlica.com', password: 'assist123' },
  { role: '관리자', email: 'admin@tourlica.com', password: 'control123' }
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      setError('아이디와 패스워드를 입력하세요.');
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
        throw new Error(data?.error ?? '로그인에 실패했습니다.');
      }

      if (!data?.account) {
        throw new Error('계정 정보를 가져오지 못했습니다.');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tourlica.account', JSON.stringify(data.account));
      }

      if (data.account.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/map');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login-card" aria-live="polite">
        <header>
          <p className="eyebrow">Agent Console Access</p>
          <h1>로그인</h1>
          <p>TourLICA 계정으로 맞춤 플래너를 불러오세요.</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>아이디</span>
            <input type="email" name="email" placeholder="name@example.com" autoComplete="username" required />
          </label>
          <label>
            <span>패스워드</span>
            <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="login-links">
          <Link href="/signup">회원가입</Link>
          <Link href="#reset">비밀번호 찾기</Link>
        </div>
        <div className="divider">
          <span>또는</span>
        </div>
        <div className="social-grid">
          {socials.map((social) => (
            <button key={social.provider} type="button" className={`social-btn ${social.provider}`}>
              {social.label}
            </button>
          ))}
        </div>
        <div className="demo-accounts">
          <p>샘플 계정</p>
          <ul>
            {demoAccounts.map((acct) => (
              <li key={acct.email}>
                <strong>{acct.role}</strong>: {acct.email} / {acct.password}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
