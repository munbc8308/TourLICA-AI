'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { SignupRole } from '../config';
import { roleInfos } from '../config';

interface SignupFormProps {
  role: SignupRole;
  info: (typeof roleInfos)[SignupRole];
}

const genderOptions = [
  { value: '', label: '성별 선택' },
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'non-binary', label: '논바이너리' },
  { value: 'prefer-not-to-say', label: '기타/응답 거부' }
];

export default function SignupForm({ role, info }: SignupFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const fingerprintParts = [navigator.userAgent, navigator.language, navigator.platform];
    if (typeof window !== 'undefined') {
      const { width, height, colorDepth } = window.screen ?? {};
      fingerprintParts.push(`${width ?? '0'}x${height ?? '0'}`, `depth:${colorDepth ?? 'unknown'}`);
    }
    setDeviceFingerprint(fingerprintParts.filter(Boolean).join(' | '));
  }, []);

  const helperText = useMemo(() => info.helperText, [info.helperText]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    const confirm = formData.get('passwordConfirm');

    if (password !== confirm) {
      setError('입력한 패스워드가 일치하지 않습니다.');
      return;
    }

    const payload = {
      role,
      name: (formData.get('name') || '').toString(),
      nickname: (formData.get('nickname') || '').toString(),
      email: (formData.get('email') || '').toString(),
      password: (password || '').toString(),
      phone: (formData.get('phone') || '').toString(),
      gender: (formData.get('gender') || '').toString(),
      country: (formData.get('country') || '').toString(),
      deviceFingerprint: deviceFingerprint || 'unknown',
      interpreterCode: role === 'interpreter' ? (formData.get('interpreterCode') || '').toString() : ''
    };

    if (!payload.email || !payload.password || !payload.name) {
      setError('필수 정보를 모두 입력하세요.');
      return;
    }

    if (role === 'interpreter' && !payload.interpreterCode) {
      setError('통역사 고유번호를 입력하세요.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message || '회원가입에 실패했습니다.');
      }

      router.push(`/login?registered=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="signup">
      <div className="signup-card">
        <header>
          <p className="eyebrow">{info.title} Sign Up</p>
          <h1>{info.title} 회원가입</h1>
          <p>{helperText}</p>
        </header>
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label>
              <span>이메일 아이디</span>
              <input type="email" name="email" placeholder="name@example.com" required autoComplete="email" />
            </label>
            <label>
              <span>이름</span>
              <input type="text" name="name" placeholder="홍길동" required autoComplete="name" />
            </label>
            <label>
              <span>별칭/닉네임</span>
              <input type="text" name="nickname" placeholder="Seoul Mate" />
            </label>
            <label>
              <span>연락처</span>
              <input type="tel" name="phone" placeholder="010-0000-0000" autoComplete="tel" />
            </label>
            <label>
              <span>국가</span>
              <input type="text" name="country" placeholder="대한민국" />
            </label>
            <label>
              <span>성별</span>
              <select name="gender" defaultValue="">
                {genderOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>패스워드</span>
              <input type="password" name="password" placeholder="8자 이상" minLength={8} required autoComplete="new-password" />
            </label>
            <label>
              <span>패스워드 확인</span>
              <input type="password" name="passwordConfirm" placeholder="다시 입력" minLength={8} required autoComplete="new-password" />
            </label>
            {role === 'interpreter' && (
              <label className="full-width">
                <span>통역사 고유번호</span>
                <input type="text" name="interpreterCode" placeholder="INT-0000" required />
              </label>
            )}
            <label className="full-width">
              <span>단말기 정보 (자동 수집)</span>
              <textarea name="deviceFingerprint" value={deviceFingerprint} readOnly rows={3} />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? '가입 처리 중...' : `${info.title}로 가입 완료`}
          </button>
        </form>
        <p className="signup-note">
          다른 역할로 가입하시겠어요? <Link href="/signup">역할 선택으로 돌아가기</Link>
        </p>
      </div>
    </main>
  );
}
