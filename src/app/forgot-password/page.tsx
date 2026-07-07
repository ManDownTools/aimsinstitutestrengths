import Image from "next/image";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="container" style={{ paddingTop: 64 }}>
      <div className="hero-bg">
        <div className="stack-5" style={{ maxWidth: 480 }}>
          <Image
            src="/logo-navy.png"
            alt="AiMS Institute"
            width={64}
            height={64}
            priority
          />
          <div>
            <h1 className="chartreuse-underline">Reset your password</h1>
            <p className="muted">
              Enter the email for your AiMS account. If there's an account, we'll send you a link to set a new password.
            </p>
          </div>
          <ForgotPasswordForm />
          <div>
            <Link href="/login" className="link-inline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
