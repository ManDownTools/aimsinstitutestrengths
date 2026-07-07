# AiMS Strengths Assessment Web App — Build Specification

This document is the complete specification for building the assessment web app. Read it fully before writing code. The assessment content (items, dimensions, scoring logic) is embedded in the appendix and is final; do not reword items.

## Stack

- **Next.js (App Router, TypeScript)** deployed on **Vercel**
- **Supabase** for Postgres, auth, and Row Level Security
- **Resend** for transactional email (invitations)
- **Anthropic API** (`claude-sonnet-4-6`) for results generation, the narrative interview, and the coaching chat. All Anthropic calls happen server-side in API routes. The API key never reaches the client.
- **Branding:** a branding system already exists in the project folder. Read it before building any UI and apply it throughout (colors, type, logo, components). Do not invent a parallel style.
- **Voice and tone:** the file `voice-and-tone.md` in the project folder is the authority on all written language in this app. Read it before writing any copy. It governs interface copy, empty states, buttons, emails, error messages, and every system prompt sent to Claude. The Voice and copy rules section below summarizes the parts that matter most for this app, but the full guide wins wherever it says more.

## Voice and copy rules (apply everywhere)

These rules apply to all user-facing text: page copy, the framing screen, buttons, emails sent via Resend, results summaries, coaching responses, and narrative interview questions.

- The brand name is always written AiMS (capital A, lowercase i, capital MS). Never AIMS, Aims, or aims. The formal name is the AiMS Institute.
- Use contractions throughout. The writing should read like a conversation with an experienced practitioner, not a legal document or a content mill.
- Never use em-dashes anywhere, including in Claude-generated output. Enforce this in every system prompt.
- Sentences vary in length and develop complete thoughts. No choppy one-line declarations, and no grammatically incomplete fragments.
- Pre-supposing language: write as if the reader already understands what they're doing and why. Don't convince or educate them about why strengths matter. Speak to the part of them that's ready.
- Banned words and phrases (these signal algorithmic writing and must not appear in any copy or any Claude output): quietly, unlock/unlocks as a metaphor, game-changer, seamless/seamlessly, harness, leverage as a verb, robust, dive into, dive deep, delve, it's worth noting, at the end of the day, in today's fast-paced business environment, in conclusion, to summarize, synergy, journey (when describing change), transformation as a standalone promise, best practices without specificity, and hedging phrases that aren't immediately followed by a specific answer.
- Positive framing throughout. The app never frames a low score as a weakness, a problem, or something to fix. This is both a voice rule and a product rule.
- Refer to the product experience as the assessment, never a test. Refer to the operating context using AiMS language where natural: the three disciplines are People, Rhythms, and Data, and the correct term is functional accountability chart, not org chart.
- Every system prompt sent to Claude (narrative interviewer, results generation, coaching) must embed these voice rules, including the banned word list, so generated output stays on brand without manual review.


## Roles and access model

Three tiers:

1. **System admin** (AiMS staff). Creates companies, creates and invites users in any company, sees everything across all companies.
2. **Company admin**. Manages their own company only. Can invite users to their company, see completion status, view every individual's results in their company, and view the company aggregate view.
3. **Team member**. Takes the assessment, sees only their own results, and has access to their own coaching chat.

Both admin tiers can invite users. Coaching conversations are private to the individual; no admin tier can read them. This is deliberate: honest coaching requires privacy, and results visibility for admins is already granted separately.

## Database schema

Enable RLS on every table. Use Supabase auth for identity; `profiles.id` references `auth.users.id`.

```sql
companies (
  id uuid pk default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
)

profiles (
  id uuid pk references auth.users(id),
  company_id uuid references companies(id),
  email text not null,
  first_name text not null,
  last_name text not null,
  position text,
  reports_to uuid references profiles(id),      -- nullable, self-referencing
  position_start_date date,                     -- date picker in UI, labeled "Position start date"
  hire_date date,
  role text not null check (role in ('system_admin','company_admin','team_member')),
  invite_status text not null default 'invited' check (invite_status in ('invited','active')),
  created_at timestamptz default now()
)

items (
  id text pk,                    -- e.g. 'thinking.ideation.competence'
  dimension text not null,       -- thinking | influence | execution | relating
  sub_strength text not null,
  item_type text not null check (item_type in ('competence','energy','orientation')),
  text text not null,            -- for orientation: option A text
  text_b text,                   -- orientation only: option B text
  direct_side text,              -- orientation only: 'A' or 'B', which option is the direct one
  legacy_tags text[],            -- merged-pair provenance, e.g. {'persuasion','rallying'}
  sort_order int not null
)

assessments (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  company_id uuid not null references companies(id),
  version int not null default 1,               -- supports retakes later
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz default now(),
  completed_at timestamptz
)

responses (
  id uuid pk default gen_random_uuid(),
  assessment_id uuid not null references assessments(id),
  item_id text not null references items(id),
  value int not null,            -- likert: 1-5; orientation: 1-4 (see scoring)
  answered_at timestamptz default now(),
  unique (assessment_id, item_id)
)

narrative_messages (
  id uuid pk default gen_random_uuid(),
  assessment_id uuid not null references assessments(id),
  role text not null check (role in ('assistant','user')),
  content text not null,
  created_at timestamptz default now()
)

results (
  id uuid pk default gen_random_uuid(),
  assessment_id uuid not null unique references assessments(id),
  profile jsonb not null,        -- structured profile, shape defined below
  summary text not null,         -- written narrative summary
  model text not null,
  generated_at timestamptz default now()
)

coaching_conversations (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  title text,
  created_at timestamptz default now()
)

coaching_messages (
  id uuid pk default gen_random_uuid(),
  conversation_id uuid not null references coaching_conversations(id),
  role text not null check (role in ('assistant','user')),
  content text not null,
  created_at timestamptz default now()
)
```

**Retakes:** the schema supports multiple assessments per user via `version`. In this build, do not expose any retake option in the UI. Each user gets exactly one assessment.

**Coaching:** the schema supports multiple conversations per user, but the UI in this build creates and uses exactly one continuous conversation per user, auto-created on first visit to the coaching page.

### RLS policy summary

- `profiles`: users read their own row; company admins read all rows in their company; system admins read all. Only admins insert/update profiles (invites); users may update their own name fields.
- `assessments`, `responses`, `narrative_messages`, `results`: owner reads and writes their own; company admins read (not write) rows where `company_id` matches theirs; system admins read all.
- `coaching_conversations`, `coaching_messages`: owner only. No admin read access.
- `companies`: system admins full access; company admins and members read their own company row.
- `items`: readable by all authenticated users; written only by migration/seed.

Use a Postgres function like `current_user_role()` and `current_user_company()` reading from `profiles` to keep policies readable. Mutations that cross privilege boundaries (creating users, sending invites) go through server-side API routes using the Supabase service role key, never through client-side RLS.

## Invitation and auth flow

1. Admin fills an invite form: email, first name, last name, position, reports to (dropdown of existing company profiles, optional), position start date (date picker), hire date (date picker), role (company admin or team member). System admins additionally pick the company; company admins are locked to their own.
2. Server route creates the auth user (`supabase.auth.admin.createUser` with email confirm disabled and no password), inserts the profile row with `invite_status = 'invited'`, generates an invite link (`supabase.auth.admin.generateLink` with type `invite`), and sends a branded invitation email via **Resend** containing that link. The email explains they've been invited to complete the AiMS Strengths Assessment.
3. The invite link lands on a **set password** page. The user creates a password before entering the app: a password field and a confirm field, both with an eye icon toggle that shows and hides the entered text. Enforce a minimum of 8 characters and show the requirement inline. On success, sign them in, set `invite_status = 'active'`, and take them to the welcome screen framing the assessment (see Framing below).
4. Subsequent logins use the `/login` page: email and password, with the same eye icon toggle on the password field, and a "Forgot password?" link.
5. **Forgot password:** the link asks for the account email, the server generates a recovery link (`supabase.auth.admin.generateLink` with type `recovery`) and sends it via Resend in a branded email. The recovery link lands on the same set-password page component (password, confirm, eye toggles), after which the user is signed in. Always respond with the same neutral confirmation whether or not the email exists, so the form can't be used to probe for accounts.
6. Admins can re-send an invitation from the dashboard for anyone still in `invited` status.

## Bootstrapping the first system admin

The app has no public signup and invites require an admin, so the first system admin is created by a seed script committed to the repo.

- Provide `npm run seed:admin`. The script uses the Supabase service role key from env and reads `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_FIRST_NAME`, and `SEED_ADMIN_LAST_NAME` from env (`.env.local`, never committed).
- It creates the auth user with that email and password (email confirmed), inserts a `profiles` row with `role = 'system_admin'`, `company_id = null`, and `invite_status = 'active'`, and prints a confirmation.
- The script is idempotent: if a user with that email already exists it updates nothing and says so, rather than erroring or duplicating.
- System admin profiles are the one case where `company_id` is null; RLS policies and any UI that assumes a company must handle that.
- Run it once against the Supabase project after migrations, then sign in normally at `/login` with those credentials.

## The assessment experience

### Framing screen (before the first card)

One screen, in brand voice, that sets the frame before any question is asked. It should communicate, in plain language: this assessment is about discovering where your strengths and energy are, not grading you; there are no wrong answers and no failing scores; low scores are useful information about configuration, not deficits; it takes about 10 to 12 minutes. Do not use the word "test" anywhere in the app. Refer to it as the assessment.

### Part 1: Likert cards (32 items)

- One item per card. The card shows the statement and five labeled options: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree. Values 1 to 5. There is no skip and no "can't tell" option.
- **Interaction:** when the user clicks an option, it visually confirms (fill/checkmark per branding), pauses roughly 800ms, then auto-advances to the next card with a smooth transition. No "next" button on unanswered cards.
- A back control lets the user step back one card to change an answer. Going back does not clear later answers.
- A slim progress indicator shows position (e.g. a progress bar; a count like "14 of 38" is acceptable).
- **Item order:** interleave dimensions rather than presenting all Thinking items together, so the pattern is less transparent. Use a fixed interleaved order (defined in the seed data via `sort_order`), the same for every user, so results are comparable. Do not group competence and energy items for the same sub-strength adjacently.
- **Persistence:** save each response to the database as it's answered. If the user leaves mid-assessment, returning resumes at the first unanswered item.

### Part 2: Orientation cards (6 items)

- Same card style. Each card shows the two options A and B as two selectable statements, with a four-point intensity control between or beneath them: Strongly A, Lean A, Lean B, Strongly B. No neutral midpoint.
- **Side randomization:** for each card, randomly swap which option renders on the left/top versus right/bottom, per user per card. The `direct_side` column plus the rendered order lets you record the response unambiguously. Store the response normalized: value 1 = strongly direct, 2 = lean direct, 3 = lean facilitative, 4 = strongly facilitative.
- Same click, pause, auto-advance behavior. Same back control and progress bar continuation.

### Part 3: Narrative interview (2 to 3 exchanges)

- After the cards, transition to a simple chat interface, still inside the assessment flow, framed as "a couple of questions in your own words."
- Claude opens with this prompt, verbatim: "Think of a time at work when you were at your best, a moment you'd point to and say that's when I was really in my element. What was happening, what were you doing, and what made it feel that way?"
- The user answers in free text. Claude asks one or two adaptive follow-ups based on what they actually said, the way a coach would in an appreciative interview: drawing out what they were doing, what energized them, what conditions made it possible. Hard cap of three assistant turns total including the opener. Then Claude thanks them and the flow moves to completion.
- A quiet "skip this step" link is available. Skipping marks the narrative as absent; results generation must handle that case.
- Persist all messages to `narrative_messages`.
- The follow-up generation is a server-side Anthropic call with a system prompt instructing: warm, plain, curious tone; questions only, no analysis or summarizing back; never mention dimensions, sub-strengths, or scoring; one question per turn; follow the person's actual content.

### Completion and results generation

- On completion, mark the assessment `completed`, show a brief "generating your results" state, and call the results generation route.
- **Results generation (server-side Anthropic call).** Input: all Likert and orientation responses with their item metadata, the narrative transcript (if present), and the person's position and position start date (as tenure) for context. The system prompt embeds the scoring logic and interpretation rules from the appendix and instructs Claude to return structured JSON plus a written summary.
- **Profile JSON shape** (stored in `results.profile`):

```json
{
  "dimensions": [
    { "dimension": "thinking", "competence_avg": 0.0, "energy_avg": 0.0 }
  ],
  "sub_strengths": [
    {
      "sub_strength": "problem_solving",
      "dimension": "thinking",
      "competence": 1,
      "energy": 1,
      "flag": "signature | capable_but_draining | hidden_pull | lower_priority",
      "narrative_evidence": "quote or null"
    }
  ],
  "orientation": { "lean": "direct | balanced | facilitative", "score": 0.0, "by_dimension": {} },
  "top_strengths": ["..."],
  "divergences": [
    { "sub_strength": "...", "note": "where scores and story disagree" }
  ],
  "narrative_coded": ["sub_strengths that surfaced in the story"]
}
```

- **Flags:** signature = high competence and high energy (4+ on both). capable_but_draining = high competence (4+), low energy (2 or less). hidden_pull = high energy, lower competence claim (possible emerging strength or modesty). lower_priority = low on both, framed strictly as configuration data, never as weakness.
- **Written summary rules (critical, this is brand voice):** follow the Voice and copy rules section and `voice-and-tone.md` in full, including the banned word list. Plain and direct, contractions, no jargon, no em-dashes. Frame everything as configuration and energy, never deficit. Low scores are described as "where your energy is better spent elsewhere," not weaknesses. The capable_but_draining flags get explicit, kind naming because they're the most useful signal. Where the story and the scores diverge, name it as something worth exploring, not an inconsistency. The summary should read like a thoughtful coach wrote it, roughly 300 to 450 words, addressed to the person as "you."

## Results views

### Individual results (team member sees their own; admins can open anyone's in their scope)

- Header with the person's top strengths (the signature flags), stated plainly.
- A dimension overview: four dimensions with paired competence and energy bars so the gap is visible at a glance. Order the dimensions Thinking, Influence, Execution, then Relating shown as the underlying layer, consistent with the arc framing.
- Sub-strength detail: each of the sixteen with its competence and energy values, its flag rendered as a plain-language chip (e.g. "Signature strength," "Capable but draining," "Emerging pull"), and narrative evidence quotes where they exist.
- Orientation: a simple spectrum visual from Direct to Facilitative with the person's lean marked, plus two sentences explaining what it means in their case.
- The written summary.
- A prominent entry point into the coaching chat: "Talk through your results."

### Company admin dashboard

- Company roster: everyone in the company, invite status, assessment status (not started, in progress, completed), with re-send invite action.
- Click into any completed person's individual results view.
- **Team view:** an aggregate grid of sub-strengths (rows) by people (columns) colored by energy score, so the admin can see where the team's energy concentrates and where nobody has pull. Include a per-dimension rollup. Frame the page with one line of AiMS language: this view exists to help configure strengths into coordinated action, not to rank people.
- Invite form (described above).

### System admin

- Company list with create-company form.
- Entering a company shows the same dashboard a company admin sees, plus the ability to invite company admins.

## Coaching chat

- Route available to any user with a completed assessment. One continuous conversation, auto-created on first visit, full history rendered, no message limits.
- Server-side Anthropic call per message. The system prompt includes: the person's full results JSON and written summary; their name, position, and tenure in the position (computed from position start date); and coaching instructions.
- **Coaching instructions (system prompt content):** You are a strengths coach working within the AiMS approach. Ground everything in the person's actual results. Lead with questions more than answers; inquiry creates movement. Focus on what's working and what's possible rather than fixing deficits. Treat capable-but-draining areas with care: the goal is configuration of their energy, not pushing through. Never invent scores or strengths not in their results. Follow the Voice and copy rules section and `voice-and-tone.md`, including the banned word list: plain, warm, direct language, contractions, no jargon, no em-dashes. Keep responses conversational in length, not essays. You may reference their narrative story if one exists.
- Do not stream the person's coaching content anywhere admins can see it.

## Design quality (required, not aspirational)

The branding system in the repo is complete and specific: `brand/tokens.css` (design tokens), `handoff/CLAUDE.md` (component and layout rules), `brand/assets/` (logos and the sky shapes texture), and the style guide. **`handoff/CLAUDE.md` is binding on every screen.** Applying the colors while defaulting to generic component styling is not acceptable; that combination produces a flat, template-looking app. Follow the system precisely:

- Import `tokens.css` at the app root and style exclusively with the semantic custom properties. No hardcoded hex values anywhere in components.
- Inter is the only typeface, loaded at weights 300 through 700, with the exact type scale from the tokens: bold Title Case navy headlines, the ALL CAPS 11px letter-spaced subhead style for labels and table headers, and 400-weight body at 14px with the specified letter spacing and 1.6 line height.
- Shape language is round and friendly per the handoff: pill buttons at the specified heights (cobalt fill primary, navy outline secondary, ghost cobalt text), 6px inputs with the cobalt focus ring halo, 10px cards with `--shadow-sm`, 16px modals.
- Use the signature accents. The chartreuse tapered underline belongs under key headings. The `shapes-sky.png` organic texture belongs behind hero bands and empty states at low opacity, never behind dense data.
- Tables follow the handoff spec: subhead-style muted header row, 1px hairlines, navy-tint row hover, right-aligned tabular numerals.
- Respect the never list: no gradients as backgrounds, no emoji in UI, no pure black, no sharp corners on interactive elements, no chartreuse text, no other fonts.
- Layout craft matters as much as tokens: generous consistent spacing on an 8px rhythm, a constrained content width, aligned form grids, and real empty states with the shape texture rather than bare gray boxes.
- The assessment cards are the emotional center of the product and deserve the most design attention: one statement presented large and confident, the five options as generous pill-shaped targets, a satisfying selected state, the 800ms pause, and a smooth transition to the next card. This screen should feel considered, calm, and pleasant on a phone.

After building each major screen, compare it against `handoff/CLAUDE.md` section by section and fix every deviation before moving on.

## Public landing page

The root of the app (`/`) is a public landing page, not an authenticated view. It explains what the assessment is and carries a simple menu with a Sign in item linking to `/login`. Authenticated users hitting `/` can be redirected to their home view (results, or the assessment if incomplete, or the admin dashboard by role).

**Structure and content:**

- A slim header with the AiMS logo on the left and a menu on the right containing Sign in. Keep the menu minimal; this build needs nothing else in it.
- A hero section that opens with a declarative statement about what the assessment does, in pre-supposing voice. It should communicate, in the brand's language: this assessment shows you where your strengths and energy are, so work can be configured around what's real. Do not open with a question.
- A short section explaining the two things it measures: what you do well and what pulls you in, and why the gap between them matters. This is the assessment's sharpest differentiator and the landing page should lead with it rather than generic strengths language.
- A short section on how it works: about 10 to 12 minutes, structured questions plus a couple of questions in your own words, results generated as a personal profile with a written summary, and a coach to talk them through with.
- A brief line establishing credibility without overclaiming, drawing on the research foundations: built on appreciative inquiry and decades of strengths research, designed for development conversations and right-seat clarity. Do not claim psychometric validation. If the project folder contains `research-behind-the-assessment.md`, its language may be adapted for this section.
- A closing section that sets expectations about access: people take the assessment by invitation from their company, so the call to action for an invited person is signing in, not self-signup. There is no public registration in this build.
- Footer with the AiMS Institute name and nothing that promises features this build doesn't have.

**Rules:** all copy follows `voice-and-tone.md` and the Voice and copy rules section, including contractions, no em-dashes, no banned words, and no questions as section openers. Branding from the project's branding folder throughout. The page must look good on phones.


- `/` public landing page with Sign in menu item
- `/login` email and password login with eye toggle and forgot-password link
- `/set-password` shared page for invite completion and password recovery
- `/welcome` post-invite landing and framing screen
- `/assessment` the card flow (parts 1 to 3) with resume logic
- `/results` own results
- `/coach` coaching chat
- `/admin` company admin dashboard (roster, team view, invites)
- `/admin/person/[id]` individual results within scope
- `/system` system admin (companies, create, enter)
- API routes: `/api/invite`, `/api/narrative`, `/api/generate-results`, `/api/coach`

## Non-negotiables

- Anthropic and Supabase service keys server-side only.
- RLS enforced on every table; verify by testing as each role.
- Assessment item text is used verbatim from the appendix. No rewording, no reordering of the five Likert labels.
- Branding from the project's branding folder throughout, including the emails sent via Resend.
- All copy follows `voice-and-tone.md`, and every Claude system prompt (narrative, results, coaching) embeds the voice rules and banned word list so generated output is on brand by construction.
- Mobile-friendly card flow; people will do this on phones.

---

# Appendix: Assessment content (final, use verbatim)

## Structure

Four dimensions framed as an arc of contribution, sixteen sub-strengths, two Likert items each (competence and energy), plus six orientation items and a short narrative interview.

- **Thinking** (generate and judge): Ideation, Problem solving, Analysis, Foresight, Judgment
- **Influence** (align and rally): Mobilizing, Communication, Direction, Connecting
- **Execution** (drive and finish): Follow-through, Organizing, Ownership
- **Relating** (the relational layer): Developing others, Empathy, Building trust, Including

Likert scale: 1 Strongly Disagree, 2 Disagree, 3 Neutral, 4 Agree, 5 Strongly Agree.

## Likert items (32)

**Thinking / Ideation**
- competence: The new ideas I put forward often end up shaping what actually gets done.
- energy: I get a charge out of dreaming up new ideas, even when no one asked for them.

**Thinking / Problem solving**
- competence: The hard problems I take on tend to actually get solved, not just worked on.
- energy: A knotty problem pulls me in rather than wearing me down.

**Thinking / Analysis**
- competence: Others often rely on my read of the information to understand what's really going on.
- energy: I enjoy digging into detail and data to work out what's really happening.

**Thinking / Foresight**
- competence: When I've called where things were heading, I've mostly turned out to be right.
- energy: Thinking through what's coming next for the business is work I'd choose to do.

**Thinking / Judgment**
- competence: Looking back at the calls I've made on which ideas to back, they've mostly held up.
- energy: I like being the one who sizes up whether an idea will hold up.

**Influence / Mobilizing** (legacy tags: persuasion, rallying)
- competence: When something needs buy-in, I'm usually able to get people genuinely behind it.
- energy: I come alive when I'm winning people over to something I believe in.

**Influence / Communication**
- competence: When something complex needs explaining to a group, I'm often the one asked to do it.
- energy: I look for chances to be the one who frames the message or speaks to the room.

**Influence / Direction**
- competence: When a decision was stalling, I've been able to step in and get the group to a call.
- energy: When a group I'm part of lacks direction, I feel a pull to provide it.

**Influence / Connecting**
- competence: New people tend to warm to me quickly.
- energy: Meeting and drawing in people I don't yet know is something I actively enjoy.

**Execution / Follow-through** (legacy tags: follow_through, drive)
- competence: The things I take on get finished, not just started.
- energy: I can't rest easy until something I've started is actually done.

**Execution / Organizing** (legacy tags: organizing, structure)
- competence: Work I've organized tends to run smoothly and keep running after I step back.
- energy: I enjoy bringing order to something scattered and building the routine that keeps it that way.

**Execution / Ownership**
- competence: I'm the person people hand something to when it absolutely has to get done.
- energy: I feel a pull to be the person others can count on to get it done.

**Relating / Developing others** (legacy tags: developing_others, supporting)
- competence: People seek me out for help getting better at what they do.
- energy: Helping someone develop is some of the most rewarding work I do.

**Relating / Empathy**
- competence: People tend to feel understood by me, sometimes before they've fully explained themselves.
- energy: I'm naturally drawn to paying attention to what the people around me need.

**Relating / Building trust**
- competence: The close working relationships I've built have lasted and held up under pressure.
- energy: Investing in a close working relationship is something I find genuinely satisfying.

**Relating / Including**
- competence: People who might otherwise sit at the edges of a group tend to get drawn in when I'm involved.
- energy: I feel a pull to make sure everyone in a group is brought in.

## Orientation items (6, forced choice with intensity)

Response options per item: Strongly A, Lean A, Lean B, Strongly B. Normalize stored values so 1 = strongly direct and 4 = strongly facilitative regardless of rendered side. Randomize which side renders first, per user per card.

**Item 1, Thinking (problem solving), direct side A**
- A: I get more energy from working a hard problem through myself and arriving at a solution.
- B: I get more energy from getting the right people together and working the problem through as a group.

**Item 2, Thinking (judgment), direct side A**
- A: When there's a call to make on which idea to back, I'd rather form my own view and put it forward.
- B: When there's a call to make on which idea to back, I'd rather draw out the group's thinking and help them land it.

**Item 3, Execution (follow-through), direct side A**
- A: I feel most productive when I'm the one doing the work and pushing it to done.
- B: I feel most productive when I'm setting others up to do the work and keeping it moving.

**Item 4, Execution (organizing), direct side A**
- A: I'd rather personally organize the pieces so a project runs the way it should.
- B: I'd rather build the routines that let the team keep a project running without me.

**Item 5, Influence (mobilizing), direct side A**
- A: To move something forward, I'd rather make the case myself and win people over.
- B: To move something forward, I'd rather create the conditions for the group to talk itself into it.

**Item 6, Influence (direction), direct side A**
- A: When a group needs direction, I get energy from being the one who provides it.
- B: When a group needs direction, I get energy from helping the group find its own.

## Narrative interview

Opening prompt (verbatim): "Think of a time at work when you were at your best, a moment you'd point to and say that's when I was really in my element. What was happening, what were you doing, and what made it feel that way?"

One or two adaptive follow-ups generated by Claude based on the person's actual answer. Maximum three assistant turns total. Never mention dimensions, sub-strengths, or scoring in the interview. Skippable via a quiet link.

## Scoring and interpretation rules (for the results generation prompt)

- Dimension scores: average competence and average energy across the dimension's sub-strengths, reported separately. Never collapse competence and energy into one number.
- Flags per sub-strength: signature (competence >= 4 and energy >= 4), capable_but_draining (competence >= 4 and energy <= 2), hidden_pull (energy >= 4 and competence <= 3), lower_priority (both <= 2).
- Orientation: mean of the six normalized values. 1.0 to 2.0 reads direct, 2.01 to 2.99 reads balanced, 3.0 to 4.0 reads facilitative. Record per-dimension means in `by_dimension` for future use even though v1 reports only the overall lean.
- Narrative coding: identify which of the sixteen sub-strengths the story evidences, with short supporting quotes. Where the story contradicts a high self-rating or reveals energy the Likert scores missed, record it in divergences and weight the story, since specific past behavior is harder to inflate than agreement with a statement.
- Interpretation stance: low scores are configuration data about where energy is better spent, never deficits. Capable-but-draining is the most valuable coaching signal and should be named kindly and explicitly. The profile is a current snapshot, not a permanent verdict.
