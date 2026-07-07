import Image from "next/image";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-hero-page">
      <div className="auth-hero-column fade-up">
        <Image
          src="/logo-white.png"
          alt="AiMS Institute"
          width={56}
          height={56}
          priority
          className="brand-logo"
        />
        <h1 className="display">
          Find the work where you're at your best.
        </h1>
        <div className="auth-hero-bar" aria-hidden="true" />
        <p className="auth-hero-sub">Sign in to the AiMS Strengths Assessment.</p>
        <div className="auth-hero-card">
          <LoginForm />
        </div>
        <div className="auth-hero-forgot">
          <a href="/forgot-password">Forgot password?</a>
        </div>
      </div>
    </main>
  );
}
