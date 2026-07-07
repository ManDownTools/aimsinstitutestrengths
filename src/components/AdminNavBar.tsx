import Link from "next/link";

export default function AdminNavBar({
  backHref,
  companyName,
  personName,
  personPosition,
}: {
  backHref: string;
  companyName: string;
  personName: string;
  personPosition: string | null;
}) {
  return (
    <nav className="admin-nav-bar" aria-label="Admin navigation">
      <Link href={backHref} className="admin-nav-back">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>Back to {companyName}</span>
      </Link>
      <div className="admin-nav-context">
        <strong>{personName}</strong>
        {personPosition ? ` · ${personPosition}` : ""}
      </div>
    </nav>
  );
}
