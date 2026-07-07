#!/usr/bin/env node
// Bootstrap one or more system admins. Idempotent: safe to re-run.
//
// Reads from .env.local (loaded by `node --env-file=.env.local`):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// For each admin, four env vars are required with a matching suffix:
//   SEED_ADMIN_EMAIL[N], SEED_ADMIN_PASSWORD[N],
//   SEED_ADMIN_FIRST_NAME[N], SEED_ADMIN_LAST_NAME[N]
//
// The first admin uses no suffix (SEED_ADMIN_EMAIL, ...) and is required.
// Additional admins use a numeric suffix starting at 2 (SEED_ADMIN_EMAIL2,
// SEED_ADMIN_PASSWORD2, ...). The script seeds every complete set it finds
// and skips any partial set with a warning.

import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

function optionalEnv(name) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserIdByEmail(target) {
  // Look up via the profiles table instead of admin.listUsers. The auth-admin
  // pagination endpoint has been returning 500 "Database error finding users"
  // on some projects, and profile.id equals auth.users.id, so this is both
  // reliable and a lot cheaper.
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", target)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function seedAdmin(spec) {
  const { email, password, firstName, lastName } = spec;
  if (password.length < 8) {
    console.error(
      `  ✗ ${email}: password must be at least 8 characters. Skipping.`,
    );
    return;
  }

  const existingId = await findAuthUserIdByEmail(email);

  let userId;
  if (existingId) {
    userId = existingId;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ✗ ${email}: failed to sync password — ${error.message}`);
      return;
    }
    console.log(`  ${email} (${userId}) — auth exists, password synced.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error(
        `  ✗ ${email}: failed to create auth user — ${error?.message ?? "unknown"}`,
      );
      return;
    }
    userId = data.user.id;
    console.log(`  ${email} (${userId}) — created auth user.`);
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, role, invite_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    console.error(`  ✗ ${email}: failed to read profile — ${profileErr.message}`);
    return;
  }

  if (profile) {
    console.log(
      `  ${email} — profile exists (role=${profile.role}, invite_status=${profile.invite_status}). No changes.`,
    );
    return;
  }

  const { error: insertErr } = await admin.from("profiles").insert({
    id: userId,
    company_id: null,
    email,
    first_name: firstName,
    last_name: lastName,
    role: "system_admin",
    invite_status: "active",
  });
  if (insertErr) {
    console.error(`  ✗ ${email}: failed to insert profile — ${insertErr.message}`);
    return;
  }
  console.log(`  ${email} — profile created as system_admin.`);
}

function readAdminSpec(suffix, required) {
  const emailKey = `SEED_ADMIN_EMAIL${suffix}`;
  const passwordKey = `SEED_ADMIN_PASSWORD${suffix}`;
  const firstNameKey = `SEED_ADMIN_FIRST_NAME${suffix}`;
  const lastNameKey = `SEED_ADMIN_LAST_NAME${suffix}`;

  const values = required
    ? {
        email: requireEnv(emailKey).toLowerCase(),
        password: requireEnv(passwordKey),
        firstName: requireEnv(firstNameKey),
        lastName: requireEnv(lastNameKey),
      }
    : (() => {
        const email = optionalEnv(emailKey);
        const password = optionalEnv(passwordKey);
        const firstName = optionalEnv(firstNameKey);
        const lastName = optionalEnv(lastNameKey);
        if (!email && !password && !firstName && !lastName) return null;
        const missing = [];
        if (!email) missing.push(emailKey);
        if (!password) missing.push(passwordKey);
        if (!firstName) missing.push(firstNameKey);
        if (!lastName) missing.push(lastNameKey);
        if (missing.length > 0) {
          console.warn(
            `  ⚠ Skipping suffix "${suffix}" — missing: ${missing.join(", ")}`,
          );
          return null;
        }
        return {
          email: email.toLowerCase(),
          password,
          firstName,
          lastName,
        };
      })();

  return values;
}

function parseOnlyFlag() {
  // Supports `--only=2`, `--only 2`, `--only ""`  ("" targets the base admin).
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--only=")) return a.slice("--only=".length);
    if (a === "--only") return args[i + 1] ?? "";
  }
  return null;
}

async function main() {
  const only = parseOnlyFlag();

  const specs = [];
  if (only === null) {
    specs.push(readAdminSpec("", true));
    for (let n = 2; n < 20; n++) {
      const suffix = String(n);
      const emailKey = `SEED_ADMIN_EMAIL${suffix}`;
      if (!process.env[emailKey]) break;
      const spec = readAdminSpec(suffix, false);
      if (spec) specs.push(spec);
    }
  } else {
    // Only the named suffix. Base admin uses --only="" (empty string).
    const spec = readAdminSpec(only, true);
    if (spec) specs.push(spec);
  }

  if (specs.length === 0) {
    console.log("Nothing to seed.");
    return;
  }
  console.log(`Seeding ${specs.length} system admin${specs.length === 1 ? "" : "s"}:`);
  for (const spec of specs) {
    await seedAdmin(spec);
  }
  console.log("Done. Sign in at /login with any of the above.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
