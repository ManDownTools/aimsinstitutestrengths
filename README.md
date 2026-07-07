# AiMS Strengths Assessment

Next.js + Supabase + Anthropic + Resend implementation of the AiMS Strengths Assessment web app.

## Stack

- Next.js 15 (App Router, TypeScript) — targeting Vercel
- Supabase (Postgres, Auth, Row Level Security)
- Resend (transactional email for invitations)
- Anthropic API (`claude-sonnet-4-6`) for narrative interview, results generation, and coaching chat

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Then in the SQL editor (or via the CLI), run these files in order:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_seed_items.sql
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings.
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings. **Server-side only. Never expose.**
- `ANTHROPIC_API_KEY` — from console.anthropic.com.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — from resend.com. The from address must be on a verified domain.
- `NEXT_PUBLIC_APP_URL` — the URL where the app is running (used inside invitation links).

### 4. Bootstrap the first system admin

Supabase auth users get created through invitations, but you need one system admin to send those invitations. Create it manually one time:

1. In Supabase Auth, click **Add user** and create a user with the email you want.
2. In the SQL editor, run:

```sql
insert into public.profiles (id, email, first_name, last_name, role, invite_status, company_id)
values (
  '<the auth.users id you just created>',
  '<their email>',
  '<first name>',
  '<last name>',
  'system_admin',
  'active',
  null
);
```

That system admin can then sign in with the magic link at `/login` and create companies and invite people.

### 5. Run locally

```bash
npm run dev
```

Visit http://localhost:3000.

## Roles

- **System admin** — creates companies, invites anyone, reads everything across all companies.
- **Company admin** — manages their company: invites people, sees completion status, sees every individual's results, sees the aggregate team view.
- **Team member** — takes the assessment, sees their own results, uses the private coaching chat.

Coaching conversations are owner-only. No admin can read them.

## Voice and copy

`voice-and-tone.md` at the project root is the authority on all written language. Every Claude system prompt embeds those rules (see `src/lib/voice-rules.ts`) so generated output stays on brand by construction. If the voice guide changes, update `voice-rules.ts` to match.

## Branding

Design tokens live in `src/app/tokens.css` (copied from the AiMS brand handoff). Do not hard-code hex values in components — always reference tokens.

## Deploying to Vercel

1. Import the repo into Vercel.
2. Set the same environment variables in Project Settings → Environment Variables.
3. Add your production URL to Supabase Auth **redirect URLs** (`/auth/callback`) so magic links work.
4. Add the production URL to Resend (verify your sending domain).

## Where to look

- Assessment content: `supabase/migrations/0003_seed_items.sql` (verbatim text, do not reword)
- Scoring: `src/lib/scoring.ts`
- Voice rules: `src/lib/voice-rules.ts`
- Claude calls: `src/app/api/narrative/route.ts`, `src/app/api/generate-results/route.ts`, `src/app/api/coach/route.ts`
- Assessment UI: `src/app/assessment/AssessmentFlow.tsx`
- Results UI: `src/components/ResultsView.tsx`
- Admin: `src/components/AdminDashboard.tsx`

## Notes

- The schema supports retakes via `assessments.version`, but the UI creates exactly one assessment per user.
- Coaching supports multiple conversations per user in the schema, but the UI creates one continuous conversation per user.
- Server-side Anthropic and Supabase service keys never reach the client.
# aimsinstitutestrengths
