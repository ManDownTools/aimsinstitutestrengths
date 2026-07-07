import Image from "next/image";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
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
        <h1 className="display">Reset your password.</h1>
        <div className="auth-hero-bar" aria-hidden="true" />
        <p className="auth-hero-sub">
          Enter the email for your AiMS account. If there's an account, we'll
          send you a link to set a new password.
        </p>
        <div className="auth-hero-card">
          <ForgotPasswordForm />
        </div>
        <div className="auth-hero-forgot">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
