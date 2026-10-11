# PROJECT.md — RohTre Vault (handoff for a new chat)

Read this first in a new chat. For details, see `README.md` (setup),
`docs/admin-guide.md` (daily use) and `docs/security-review.md` (security).

## What it is
A private, YouTube-style library of the studio's approved effects, music, sound
effects, fonts and text presets. Editors browse cards, watch a short YouTube
preview, open the card's Loom tutorial and get the project files or downloads
(Mega links). Only the admin creates accounts. Each editor can be limited to
certain filters; senior editors get "All access".

**The website stores no videos or files.** Supabase holds only text: card
details, links, filters, users and the audit log (about 1–2 KB per card, so the
free 500 MB database is plenty). Per card the admin pastes:

| What | Where it is uploaded | What the site stores |
|---|---|---|
| Preview clip | YouTube, **unlisted** | YouTube link / ID |
| Tutorial | Loom, restricted | Loom link |
| Project files, downloads | Mega | Mega links (released only after an access check) |

Cloudinary was discussed and not adopted: its free plan caps storage and
playback; YouTube unlisted is free and already built in.

## Stack
- Next.js **16.4** (App Router, `src/proxy.ts` instead of middleware, Cache
  Components). **Read `node_modules/next/dist/docs/` before writing code**
  because this Next.js version differs from older ones (see `AGENTS.md`).
- React 19.3, TypeScript, Tailwind 4, font Space Grotesk.
- Supabase: Postgres with RLS, Auth (TOTP 2FA), Edge Functions (Deno).
- Vitest for unit tests.
- OS: Windows, PowerShell. Repo: `C:\Agents\rohtre-vault`.
- GitHub: `origin` = https://github.com/failsdaddy-dev/rohtre-vault. Branches
  `build/v1` (work) and `main` (production, deployed by Vercel).
  Push only when the user says so.
- Hosting: Vercel (guide: `docs/deploy-vercel.md`).

## Status (as of 2026-10-11)
Branch `build/v1`, also pushed as `main` for Vercel. All planned stages are done,
plus a design/UX round on 2026-10-11 (committed and pushed 2026-10-11).

| Stage | Done |
|---|---|
| DB | Schema, RLS access rules, seed, RLS SQL test, Supabase setup guide |
| S1 | YouTube-style UI on sample data, renamed to RohTre Vault |
| S3–S6 | Sign-in, 2FA, real Supabase data, admin panel, link release via Edge Function |
| S7–S8 | Motion/a11y polish, CSP + security headers, security review |
| Fixes | Date.now prerender error, 2FA QR rendering, landing page, admin 2FA on/off switch with fresh QR codes |
| 2026-10-11 | Design round + account changes (below), Vercel-ready |

### 2026-10-11 round
Design
- **Landing page** (`src/app/page.tsx`): short Peak-Pilots-style page in red/black:
  header, hero on diagonal streaks with red gradient text, stats strip on a red
  offset block, five library tiles, "Preview. Learn. Use.", striped CTA banner, footer.
- **Landing intro** (`src/components/landing-intro.tsx`): a solid backdrop
  hides the page from frame one; 10 red gradient stripes drop in left to right,
  "ROHTRE VAULT" rises letter by letter, then the stripes fall away downward and
  the hero fades in (~3.4 s). Click or any key skips it. Hidden when the OS
  asks for reduced motion (Windows: Accessibility → Visual effects →
  Animation effects off).
- **Brand mark**: `VaultLogo` in `src/components/icons.tsx` (safe with red dial
  and red shield + check; outline/fills follow the theme). Used in `Wordmark`,
  sign-in panel, landing CTA. Favicon `src/app/icon.svg` uses the same design.
- **Offset block effect** (`.vh-offset`, `.on-hover` in `globals.css`): bordered
  panel on a solid red block. Library cards (`.vh-card`, desktop only), landing
  tiles and the stats strip use it.
- **Button hover** (`.vh-press`): every button/chip lifts with a 3px offset
  block (red; text colour on red buttons) and presses flat on click. Round
  icon buttons opt out with `.no-lift`. Note: this animates `box-shadow`, a
  deliberate exception to the "transform/opacity only" motion rule.
- **Sidebar** (`.vh-nav`, `src/components/guide.tsx`): items slide in, icons
  nudge on hover, red bar + red icon on the current page (Admin included).
- **Fields and search** (`.vh-field`): no hard outline inside inputs; a soft red
  ring around the field instead. Top search bar is one rounded pill.
- **Dropdowns**: `<select>` uses the customizable select (`appearance:
  base-select`; rounded list with red check, Chromium only, native elsewhere).
  Pop-up menus use `.vh-menu` / `.vh-menu-item` (account menu, card ⋯ menu,
  project/download menus, active-filters popup, admin cards popup).
- **Sign-in, No access, 404** use `AuthShell` + `AuthCard`
  (`src/components/auth-shell.tsx`): striped red brand panel + form card on a
  red offset block. Login has icons, show/hide password, themed autofill.
- "Add group" (and every admin button) no longer wraps.

Accounts
- **No forced password change.** Editors keep the password the admin sets;
  only the admin changes it (Reset password). `/account/password` was deleted,
  `requireViewer` no longer redirects, Edge Functions set
  `must_change_password=false`, migration
  `20261011100000_no_forced_password_change.sql` changes the default and clears
  existing rows. The column stays but nothing reads it.
- **"Never expires" switch** in Add/Edit user (on by default; off shows a
  required date).
- **Login asks the 2FA code once per sign-in**: an already signed-in, verified
  visitor on `/login` is sent straight on; one who signed in but skipped the
  code goes straight to the code step. "Use a different account" signs out.
  The code box is protected from browser/password-manager autofill.

Test data
- `supabase/tests/sample_card.sql` adds one published card
  "TEST · Glitch transition" (Effects; Big Buck Bunny preview; FC 27, Cartoon,
  Premiere Pro; two placeholder Mega links to mega.nz; no Loom). The user ran
  it; **make sure it is deleted before launch:**
  `delete from public.cards where slug = 'test-glitch-transition';`

## Next steps
1. **Run in your PowerShell** (needed for the password change), unless already done:
   ```powershell
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   npx supabase functions deploy admin-create-user --use-api
   npx supabase functions deploy admin-manage-user --use-api
   ```
2. Restart `npm run dev` and check the design round in the real app (sidebar,
   menus, admin dropdowns and card hover were not seen by Claude: they need
   sign-in, and Claude may not type passwords).
4. Deploy on **Vercel** from `main`: follow `docs/deploy-vercel.md`, then the
   launch checklist below.

## Run and check
```powershell
npm install
npm run dev          # http://localhost:3000
npm test             # vitest (16 tests)
npx tsc --noEmit
npm run lint
npm run build; npm start
```
- No `.env.local` → **sample mode** (sample cards, no login, admin off).
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only. Never put the secret key in the app.
- `npm run db:types` regenerates `src/lib/database.types.ts`.
- If `tsc` complains about `.next/types/validator.ts` after a route was
  removed, run `npm run build` once to regenerate it.
- The dev server sometimes stops picking up `globals.css` edits; restart it.
- Visual checks without sign-in: `npm run build`, `npx next start -p 3100`,
  headless Edge screenshots (the landing, login, 404 pages are public).

## Supabase
- Project ref `arrnlfyresvqtysgyqlv`. It is **not** in the Supabase account
  connected to Claude's MCP tools, so SQL is run by the user in the dashboard.
- Migrations (`supabase/migrations/`): `core_schema`, `access_rules`,
  `triggers_and_rpc`, `admin_helpers`, `admin_mfa_switch`,
  `no_forced_password_change`. Push with `npx supabase db push --linked`
  (try `--dry-run` first).
- Edge Functions (deploy with `--use-api`, no Docker needed): `get-asset-link`,
  `admin-create-user`, `admin-manage-user`; shared code is in `_shared/common.ts`.
  The `ALLOWED_ORIGINS` secret sets CORS.
- RLS test: paste `supabase/tests/rls_test.sql` into the SQL editor. It should
  print `RLS TEST RESULTS: 50 passed, 0 failed` and rolls back its test data.
- Auth settings: sign-ups off, anonymous sign-ins off, TOTP MFA on.
- First admin: create the user in the dashboard, then
  `update public.profiles set role='admin', all_access=true, must_change_password=false where email=...`.
- The user runs Supabase CLI commands in their own PowerShell (interactive).
  Never paste keys or passwords into chat.
- Free plan: the project **pauses after about a week without activity**;
  resume it in the dashboard (Pro avoids this).

## How access works (core rules)
- Every table has RLS for `authenticated` only; `anon` has no grants.
- `private.can_view_card` checks `is_active` and `expires_at` on every read.
  Disabling a user also bans the login.
- Cards, filters, counts, search and direct links all use one visibility rule
  (`browse_cards`, `can_view_filter`).
- `card_links.url` (Mega) is never granted to browser roles. Only
  `get-asset-link` returns a URL, after an access check, and logs it to the audit log.
- Admin writes need an active admin and, while admin 2FA is on, an **aal2**
  session (enforced in `private.is_admin` and in the Edge Functions).
- 2FA is asked once per sign-in. A fresh sign-in (after Sign out, Incognito,
  new browser, cleared cookies) always asks for the code.
- Filters: same group = OR, different groups = AND.

## Code map
```
src/proxy.ts                 session refresh, sends guests to /login
src/app/page.tsx             landing page (+ components/landing-intro.tsx)
src/app/login, auth/signout, no-access, not-found   (AuthShell pages)
src/app/(hub)/[section]/[slug]   browse sections + card pages
src/app/(hub)/admin/         overview, cards (new/[id]), filters, sections,
                             users, audit, security (2FA)
src/app/globals.css          tokens + all shared effects (vh-offset, vh-press,
                             vh-nav, vh-field, vh-menu, select, intro)
src/components/              top-bar (Wordmark, ThemeToggle), guide (sidebar),
                             chip-bar, filter-panel, video-card, preview-player,
                             loom-modal, card-actions, auth-shell, icons
                             (VaultLogo), admin/*
src/lib/                     data-source (+ -supabase, mock-data), auth,
                             admin-api, url-state, youtube, loom, supabase/*
supabase/                    migrations, functions, seed.sql,
                             tests/rls_test.sql, tests/sample_card.sql
tests/logic.test.ts          unit tests (incl. safeNext redirect check)
docs/                        setup-supabase, admin-guide, security-review, loom-transcript
```

## Before launch
1. Set the `ALLOWED_ORIGINS` secret to the real domain (remove localhost).
2. Set the Auth Site URL and redirect URLs to the real domain.
3. Check that sign-ups and anonymous sign-ins are off and TOTP is on.
4. Re-run the RLS test after `db push` and keep the passing result.
5. Fix anything listed in Supabase Dashboard → Advisors (security).
6. Make sure the test card is gone (see Test data above).

## Known limits / open questions
- Shared links still need a login. Editors who legitimately open a Mega link
  can't be stopped from downloading or recording it; the audit log shows who opened what.
- Loom and YouTube URLs are visible to signed-in users (needed to embed them).
  Keep YouTube previews unlisted and Loom videos restricted.
- The CSP uses `'unsafe-inline'` (nonce-based CSP could come later).
- Unknown section URLs return HTTP 200 with a "not available" page.
- Unverified: whether Loom still honours `hide_owner` / `hideEmbedTopBar`.
- Lost 2FA phone: delete the row in `auth.mfa_factors` via SQL (see admin guide).
- Styled `<select>` lists only in Chromium browsers; others show native lists.
- In dev, a redirect inside the hub layout (e.g. disabled user → /no-access)
  can show a Next "validate instant UI … NEXT_REDIRECT" overlay. Dev only.
- `docs/security-review.md` says "48 passed" in one place and 50 in another;
  the test has 50 checks.
- `must_change_password` column is unused now; it could be dropped later
  (needs a migration + `npm run db:types`).
