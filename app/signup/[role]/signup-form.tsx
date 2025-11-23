'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SignupRole } from '../config';
import { roleInfos } from '../config';

interface SignupFormProps {
  role: SignupRole;
  info: (typeof roleInfos)[SignupRole];
}

export default function SignupForm({ role, info }: SignupFormProps) {
  const t = useTranslations('Signup.form');
  const tRoles = useTranslations('Signup.roles');
  const tAuth = useTranslations('Auth');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  const genderOptions = [
    { value: '', label: t('genderPlaceholder') },
    { value: 'female', label: t('genderFemale') },
    { value: 'male', label: t('genderMale') },
    { value: 'non-binary', label: t('genderNonBinary') },
    { value: 'prefer-not-to-say', label: t('genderPreferNotToSay') }
  ];

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const fingerprintParts = [navigator.userAgent, navigator.language, navigator.platform];
    if (typeof window !== 'undefined') {
      const { width, height, colorDepth } = window.screen ?? {};
      fingerprintParts.push(`${width ?? '0'}x${height ?? '0'}`, `depth:${colorDepth ?? 'unknown'}`);
    }
    setDeviceFingerprint(fingerprintParts.filter(Boolean).join(' | '));
  }, []);

  const roleTitle = tRoles(`${role}.title`);
  const helperText = tRoles(`${role}.helperText`);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    const confirm = formData.get('passwordConfirm');

    if (password !== confirm) {
      setError(t('passwordMismatch'));
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
      setError(t('missingFields'));
      return;
    }

    if (role === 'interpreter' && !payload.interpreterCode) {
      setError(t('missingInterpreterCode'));
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
        throw new Error(message || t('signupFailed'));
      }

      router.push(`/login?registered=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signupError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="signup">
      <div className="signup-card">
        <header>
          <p className="eyebrow">{roleTitle} Sign Up</p>
          <h1>{roleTitle} {tAuth('signup')}</h1>
          <p>{helperText}</p>
        </header>
        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label>
              <span>{t('emailLabel')}</span>
              <input type="email" name="email" placeholder={t('emailPlaceholder')} required autoComplete="email" />
            </label>
            <label>
              <span>{t('nameLabel')}</span>
              <input type="text" name="name" placeholder={t('namePlaceholder')} required autoComplete="name" />
            </label>
            <label>
              <span>{t('nicknameLabel')}</span>
              <input type="text" name="nickname" placeholder={t('nicknamePlaceholder')} />
            </label>
            <label>
              <span>{t('phoneLabel')}</span>
              <input type="tel" name="phone" placeholder={t('phonePlaceholder')} autoComplete="tel" />
            </label>
            <label>
              <span>{t('countryLabel')}</span>
              <input type="text" name="country" placeholder={t('countryPlaceholder')} />
            </label>
            <label>
              <span>{t('genderLabel')}</span>
              <select name="gender" defaultValue="">
                {genderOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('passwordLabel')}</span>
              <input type="password" name="password" placeholder={t('passwordPlaceholder')} minLength={8} required autoComplete="new-password" />
            </label>
            <label>
              <span>{t('passwordConfirmLabel')}</span>
              <input type="password" name="passwordConfirm" placeholder={t('passwordConfirmPlaceholder')} minLength={8} required autoComplete="new-password" />
            </label>
            {role === 'interpreter' && (
              <label className="full-width">
                <span>{t('interpreterCodeLabel')}</span>
                <input type="text" name="interpreterCode" placeholder={t('interpreterCodePlaceholder')} required />
              </label>
            )}
            <label className="full-width">
              <span>{t('deviceInfoLabel')}</span>
              <textarea name="deviceFingerprint" value={deviceFingerprint} readOnly rows={3} />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? t('submitting') : t('submitButton', { role: roleTitle })}
          </button>
        </form>
        <p className="signup-note">
          {t('backToRoleSelection')} <Link href="/signup">{t('backLink')}</Link>
        </p>
      </div>
    </main>
  );
}
