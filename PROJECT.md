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
- Supabase: Postgres with RLS, Auth (email + password), Edge Functions (Deno).
- Vitest for unit tests.
- OS: Windows, PowerShell. Repo: `C:\Agents\rohtre-vault`.
- GitHub: `origin` = https://github.com/failsdaddy-dev/rohtre-vault. Branches
  `build/v1` (work) and `main` (production, deployed by Vercel).
  Push only when the user says so.
- Hosting: Vercel (guide: `docs/deploy-vercel.md`).

## Status (as of 2026-10-12)
Branch `build/v1`, also pushed as `main` for Vercel. All planned stages are done,
plus a design/UX round on 2026-10-11 (committed and pushed 2026-10-11).

| Stage | Done |
|---|---|
| DB | Schema, RLS access rules, seed, RLS SQL test, Supabase setup guide |
| S1 | YouTube-style UI on sample data, renamed to RohTre Vault |
| S3–S6 | Sign-in, 2FA, real Supabase data, admin panel, link release via Edge Function |
| S7–S8 | Motion/a11y polish, CSP + security headers, security review |
| Fixes | Date.now prerender error, 2FA QR rendering, landing page, admin 2FA on/off switch (2FA later removed) |
| 2026-10-11 | Design round + account changes (below), Vercel-ready |
| 2026-10-12 | 2FA removed; previews always loop, without YouTube's overlay (below) |

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
- Already signed-in visitors on `/login` are sent straight on.

### 2026-10-12 round
- **2FA removed** (owner's decision). Sign-in is email + password only.
  Deleted: the code step in `login-form.tsx`, `/admin/security` and
  `security-admin.tsx`, the "2FA" admin tab, aal checks in `src/lib/auth.ts`
  (`requireAdmin()` takes no options) and in `_shared/common.ts`. Migration
  `20261012100000_remove_2fa.sql` redefines `private.is_admin()` without aal,
  drops `private.user_has_mfa`, deletes all rows in `auth.mfa_factors`.
  Landing stat "2FA / Protected" became "100% / Private".
- The hidden-overlay preview experiment from this morning was reverted the
  same day (see the media round below).

### 2026-10-12: YouTube removed (owner's decision, after the media round)
- No YouTube anywhere: the YouTube link / Test embed fields, the full-video
  player (`youtube-player.tsx`), `lib/youtube.ts`, YouTube thumbnails and the
  YouTube CSP entries (script-src, frame-src, img-src) are gone. Video cards
  = Cloudinary preview clip only; clicking a card opens the modal with the
  clip bigger (`clipLargeUrl`, w<=1280) + buttons; the card page shows the
  same. Cards without a clip show the section placeholder. The DB columns
  `youtube_id`, `preview_start`, `preview_end` stay but are unused (the enum
  value `media_type = 'youtube'` now just means "video card").

### 2026-10-12 media round (branch `feature/media-v2`, not committed or pushed)
Principle: the site shows PREVIEWS; real files stay on Mega.
- **Reverted** the hidden-YouTube-UI card preview (stacked players, cover,
  0.25x warm-up). It broke YouTube's embed rules and, in the owner's Chrome,
  never lifted its cover, so cards showed only thumbnails. The YouTube
  preview player (`preview-player.tsx`, start/end fields) is gone from cards.
- **Card previews = Cloudinary clips** (`clip-preview.tsx`): a silent clip
  (MP4/WebM/MOV, max 10 s / 2 MB) uploaded by the admin, played by the
  browser's own `<video muted loop>`: no buttons, no logo (CapCut-style).
  Cards load a 480 px, sound-free variant (`c_limit,w_480,q_auto,ac_none`)
  and use the clip's first frame (`so_0`) as thumbnail; without a clip, the
  YouTube thumbnail only. `preview-coordinator.ts`: cards on screen, nearest
  the middle first, `PREVIEW_MAX_PLAYERS = 8`, 150 ms stagger,
  `PREVIEW_AUTOPLAY` switch, paused during the video modal / audio, hidden
  tab, reduced motion.
- **Full video on click** (`video-modal.tsx`, `youtube-player.tsx`): modal
  with YouTube's default player (controls, sound, fullscreen; iframe
  `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`,
  `referrerpolicy=strict-origin-when-cross-origin`); URL becomes
  `/section/slug` (history.pushState), Back/Esc close; card page shows the
  same player. Errors 100/101/150/153 show a clear message; admin **Test
  embed** checks a link before publishing.
- **Music = 30-second MP3 preview** (max 1 MB) on Cloudinary, played in the
  docked player (`audio-player.tsx`, waveform from peaks read at upload,
  seek + buffered bar, volume, loop, Media Session, Space/arrows/M, hard
  30 s cap). The player's buttons are the card's own (Tutorial, Open on
  platform, Download = Mega). One track at a time; previews pause.
- **Data:** `cards.media_type` (youtube | audio; Music defaults to audio,
  Sound effects per card), `cards.preview_clip` and `cards.audio_preview`
  (jsonb: url, public_id, version, format, bytes, duration, + width/height
  or peaks) with check constraints for the limits and the Cloudinary host.
  Previews are public files with unguessable names (owner's choice); no
  protected table, no signed URLs. Migrations
  `20261012120000_media_previews.sql` + `20261012130000_switch_to_preview_files.sql`.
  An earlier draft of 120000 (card_audio table, signed audio) WAS pushed to
  the hosted project on 2026-10-12; 130000 converts it (idempotent).
- **Functions:** `cloudinary-sign-upload` {kind: video|audio} (admin; signs a
  direct browser upload, server-picked public_id, allowed formats);
  `cloudinary-delete-preview` (admin; refuses files still in use).
  `get-asset-link` is unchanged (Mega only).
- **Preview maker (Option A)** (`admin/preview-maker.tsx`, `lib/make-preview.ts`):
  big source videos (e.g. 50 MB+ effects, MP4 or transparent ProRes MOV)
  are cut and shrunk IN THE ADMIN'S BROWSER with ffmpeg.wasm (single-thread
  @ffmpeg/core 0.12.10, GPL-2.0; @ffmpeg/ffmpeg 0.12.15, MIT): start slider,
  6/8/10 s, silent 854x480 H.264 on a dark background (alpha stays visible),
  retries smaller until < 2 MB; only the small file is uploaded. Tool files
  are self-hosted in `public/ffmpeg` (copied by `scripts/copy-ffmpeg.mjs` on
  predev/prebuild, gitignored, ~32 MB, loaded only by the admin) and loaded
  at runtime with `turbopackIgnore` (bundling it fails). CSP gained
  `'wasm-unsafe-eval'` and `worker-src 'self' blob:`. Not browser-tested by
  Claude at the owner's request; the owner tests it manually.
- **Audio preview maker** (`admin/audio-preview-maker.tsx`, same tool): any
  track up to 300 MB (MP3/WAV/M4A/AAC/FLAC/OGG) -> whole-song waveform
  (decoded by the tool at 4 kHz mono), draggable 30 s window + Start slider,
  "Listen to this part", optional 0.5 s fade in/out, 128 kbps stereo MP3
  (96 kbps fallback) under 1 MB. Ready 30 s MP3s under 1 MB upload directly.
  The build's configure flags include libmp3lame (checked in the wasm).
- Admin form (`preview-uploader.tsx`): file checks (type, size, length),
  progress + Cancel, Replace, ✕, Test play; unsaved uploads are deleted when
  the admin leaves; old files are deleted on save; card delete removes its
  preview. Setup: `docs/cloudinary-setup.md`. RLS test: 2FA checks replaced,
  preview limit checks added (53 checks). Signing unit tests use
  Cloudinary's worked examples.

Test data
- `supabase/tests/sample_card.sql` adds one published card
  "TEST · Glitch transition" (Effects; Big Buck Bunny preview; FC 27, Cartoon,
  Premiere Pro; two placeholder Mega links to mega.nz; no Loom). The user ran
  it; **make sure it is deleted before launch:**
  `delete from public.cards where slug = 'test-glitch-transition';`

## Next steps
1. **Run in your PowerShell** (needed for the 2FA removal):
   ```powershell
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   npx supabase functions deploy admin-create-user --use-api
   npx supabase functions deploy admin-manage-user --use-api
   npx supabase functions deploy get-asset-link --use-api
   npx supabase functions deploy cloudinary-sign-upload --use-api
   npx supabase functions deploy cloudinary-delete-preview --use-api
   ```
   Before that, set the Cloudinary secrets (docs/cloudinary-setup.md).
   Then in Supabase → Authentication → Multi-Factor, TOTP can be switched off.
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
- Auth settings: sign-ups off, anonymous sign-ins off. No MFA.
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
- Admin writes need an active, unexpired admin profile (enforced in
  `private.is_admin` and in the Edge Functions). No 2FA.
- Filters: same group = OR, different groups = AND.

## Code map
```
src/proxy.ts                 session refresh, sends guests to /login
src/app/page.tsx             landing page (+ components/landing-intro.tsx)
src/app/login, auth/signout, no-access, not-found   (AuthShell pages)
src/app/(hub)/[section]/[slug]   browse sections + card pages
src/app/(hub)/admin/         overview, cards (new/[id]), filters, sections,
                             users, audit
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
3. Check that sign-ups and anonymous sign-ins are off.
4. Re-run the RLS test after `db push` and keep the passing result.
5. Fix anything listed in Supabase Dashboard → Advisors (security).
6. Make sure the test card is gone (see ### 2026-10-12 round
- **2FA removed** (owner's decision). Sign-in is email + password only.
  Deleted: the code step in `login-form.tsx`, `/admin/security` and
  `security-admin.tsx`, the "2FA" admin tab, aal checks in `src/lib/auth.ts`
  (`requireAdmin()` takes no options) and in `_shared/common.ts`. Migration
  `20261012100000_remove_2fa.sql` redefines `private.is_admin()` without aal,
  drops `private.user_has_mfa`, deletes all rows in `auth.mfa_factors`.
  Landing stat "2FA / Protected" became "100% / Private".
- **Previews always loop.** The account-menu "Autoplay visible previews"
  toggle and the `autoplay` setting are gone. Every card on screen plays its
  preview (cap `MAX_PLAYING = 8` in `preview-coordinator.ts`; a hovered card
  always gets a slot).
- **No YouTube overlay on previews** (`preview-player.tsx`). YouTube shows
  its title, pause button and logo for ~3.5 s after any start or seek, and no
  player parameter stops it (tested in headless Edge). Each preview now runs
  two players that take turns: the next one seeks to ~1 s before `start`,
  plays at 0.25x underneath the visible one (covered, not hidden: hidden
  cross-origin iframes get throttled and the overlay never fades), and comes
  to the front at `start` once 4.5 s of real playback have passed. The
  thumbnail covers the card until the first clean frame (~5 s). Costs: two
  iframes per playing card; a clip with Start below ~1 s loops from ~1 s.

Test data above).

## Known limits / open questions
- Shared links still need a login. Editors who legitimately open a Mega link
  can't be stopped from downloading or recording it; the audit log shows who opened what.
- Loom and YouTube URLs are visible to signed-in users (needed to embed them).
  Keep YouTube previews unlisted and Loom videos restricted.
- The CSP uses `'unsafe-inline'` (nonce-based CSP could come later).
- Unknown section URLs return HTTP 200 with a "not available" page.
- Unverified: whether Loom still honours `hide_owner` / `hideEmbedTopBar`.
- Styled `<select>` lists only in Chromium browsers; others show native lists.
- In dev, a redirect inside the hub layout (e.g. disabled user → /no-access)
  can show a Next "validate instant UI … NEXT_REDIRECT" overlay. Dev only.
- `docs/security-review.md` says "48 passed" in one place and 50 in another;
  the test has 50 checks.
- `must_change_password` column is unused now; it could be dropped later
  (needs a migration + `npm run db:types`).
