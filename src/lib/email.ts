// Auth-email dispatcher.
//
// Everything that sends an authentication email — invitations, invite resends,
// password recoveries — funnels through this module so a future switch to
// Resend (or any other provider) is a single-file change.
//
// Current behavior: Supabase's built-in email service sends the message using
// the project's default templates. The links land on
// `/auth/callback?next=/set-password`, which exchanges the code for a session
// and redirects to the shared set-password page.
//
// SWAP-TO-RESEND POINT
// --------------------
// When you're ready to move off Supabase's built-in email:
//   1. In each function below, replace the `inviteUserByEmail` /
//      `resetPasswordForEmail` call with `admin.auth.admin.generateLink(...)`,
//      which returns a link WITHOUT sending an email.
//   2. Send the returned `link.properties.action_link` via `resend().emails.send(...)`
//      using your branded HTML template.
//   3. Delete the Supabase auth-email templates in the dashboard, or turn them
//      off, so users don't receive both.
// Callers should not need to change.

import { createServiceSupabase } from "@/lib/supabase/admin";

function baseUrl() {
  // Prefer an explicit NEXT_PUBLIC_APP_URL (production canonical URL). Fall
  // back to Vercel's per-deployment host so preview branches still work, then
  // to localhost for local dev.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3100";
}

function authRedirect() {
  // Land directly on /set-password. That page handles both the PKCE ?code=xxx
  // query and the implicit-flow #access_token=xxx hash fragment so the invitee
  // never sees a login screen they can't get past.
  return `${baseUrl()}/set-password`;
}

export type InvitedUser = { userId: string };

/**
 * Create a brand-new auth user and send them an invite email. Returns the
 * new auth user's id so the caller can insert a matching profile row.
 */
export async function sendInvite(args: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<InvitedUser> {
  const admin = createServiceSupabase();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: authRedirect(),
    data: {
      first_name: args.firstName,
      last_name: args.lastName,
    },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "invite failed");
  }
  return { userId: data.user.id };
}

/**
 * Re-send an invitation to a user who already has an auth record but hasn't
 * finished onboarding. Supabase's `invite` type refuses to run on existing
 * users, so we use `resetPasswordForEmail` — from the recipient's point of
 * view it's the same "set your password" experience.
 */
export async function resendInvite(email: string): Promise<void> {
  const admin = createServiceSupabase();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect(),
  });
  if (error) throw new Error(error.message);
}

/**
 * Public password-recovery entry point. Supabase silently no-ops on unknown
 * emails, so this is safe to call without leaking whether the address exists.
 */
export async function sendPasswordRecovery(email: string): Promise<void> {
  const admin = createServiceSupabase();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect(),
  });
  if (error) throw new Error(error.message);
}
