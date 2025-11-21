'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { roleList } from './config';

export default function SignupLandingPage() {
  const router = useRouter();

  return (
    <main className="signup">
      <div className="signup-card">
        <header>
          <p className="eyebrow">Choose your role</p>
          <h1>어떤 역할로 가입하시겠어요?</h1>
          <p>관광객 · 통역사 · 도우미 중 선택하면 맞춤 가입 폼으로 이동합니다.</p>
        </header>
        <div className="role-grid">
          {roleList.map((role) => (
            <article key={role.key} className="role-option">
              <div>
                <h2>{role.title}</h2>
                <p>{role.tagline}</p>
                <ul>
                  {role.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => router.push(`/signup/${role.key}`)}>
                {role.title}로 가입하기
              </button>
            </article>
          ))}
        </div>
        <p className="signup-note">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}
