import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Diagnostic-only. Reports which env vars the running function can see,
// without exposing values. Delete this file once you've confirmed the
// deployment is picking up the right variables.
export async function GET() {
  const has = (name: string) => {
    const v = process.env[name];
    return {
      present: typeof v === "string" && v.length > 0,
      length: typeof v === "string" ? v.length : 0,
      prefix:
        typeof v === "string" && v.length > 0
          ? v.slice(0, 4) + "..."
          : null,
    };
  };
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
    ANTHROPIC_API_KEY: has("ANTHROPIC_API_KEY"),
    NEXT_PUBLIC_APP_URL: has("NEXT_PUBLIC_APP_URL"),
    VERCEL_URL: has("VERCEL_URL"),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    node_version: process.version,
  });
}
