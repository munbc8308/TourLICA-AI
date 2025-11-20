import Link from 'next/link';

const socials = [
  { label: 'Google로 계속하기', provider: 'google' },
  { label: 'Apple로 계속하기', provider: 'apple' },
  { label: 'Kakao로 계속하기', provider: 'kakao' },
  { label: 'Naver로 계속하기', provider: 'naver' }
];

export default function LoginPage() {
  return (
    <main className="login">
      <div className="login-card" aria-live="polite">
        <header>
          <p className="eyebrow">Agent Console Access</p>
          <h1>로그인</h1>
          <p>TourLICA 계정으로 맞춤 플래너를 불러오세요.</p>
        </header>
        <form className="login-form">
          <label>
            <span>아이디</span>
            <input type="email" name="email" placeholder="name@example.com" autoComplete="username" required />
          </label>
          <label>
            <span>패스워드</span>
            <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
          </label>
          <button type="submit">로그인</button>
        </form>
        <div className="login-links">
          <Link href="#signup">회원가입</Link>
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
      </div>
    </main>
  );
}
