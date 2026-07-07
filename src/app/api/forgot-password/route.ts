import { NextResponse } from "next/server";
import { sendPasswordRecovery } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as {
    email?: string;
  };

  // Always return the same neutral response so the form can't be used to
  // probe for accounts. Supabase's resetPasswordForEmail silently no-ops on
  // unknown emails, so we don't need to check the database ourselves.
  if (email && typeof email === "string" && email.includes("@")) {
    try {
      await sendPasswordRecovery(email.trim().toLowerCase());
    } catch {
      // Swallow errors on purpose — response must not vary based on
      // whether the email exists or whether email delivery worked.
    }
  }

  return NextResponse.json({ ok: true });
}
