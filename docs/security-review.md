# Security review (Stage 8)

Scope: everything on branch `build/v1`. Goal from the owner: if this library
leaks, years of work leak with it.

## What protects the data

| Risk | Protection | Where |
|---|---|---|
| Someone not signed in reads data | No public signup; every table has RLS with `to authenticated` policies only; anon has no table grants at all | `20261010120100_access_rules.sql` |
| A former editor keeps a valid session | RLS checks `profiles.is_active` and `expires_at` on every read; disabling also bans the login so the session can't refresh | `private.can_view_card`, `admin-manage-user` |
| A restricted editor discovers other content | Cards, filters, groups, counts, search and card links all use the same visibility rule; an unknown or hidden filter in a URL returns nothing | `browse_cards`, `can_view_filter` |
| Mega links copied from the page or network tab | `card_links.url` is never granted to browser roles (column privileges). Only `get-asset-link` (service role) returns one URL after an access check, and logs it | `release_asset_link` |
| An editor promotes themselves | No browser writes on profiles or access lists; role is never read from user metadata | access rules, `handle_new_user` |
| Stolen admin password | While admin 2FA is switched on, admin writes require a code-verified (aal2) session, in the database and in the Edge Functions. Switching 2FA off itself needs an aal2 session. If the admin switches 2FA off, the password alone is enough (owner's choice) | `private.is_admin`, `_shared/common.ts` |
| Login redirect abuse | `?next=` accepts same-site paths only | `safeNext` (unit tested) |
| Other sites embedding or scripting the app | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, CORS on functions limited to `ALLOWED_ORIGINS` | `next.config.ts`, functions |
| Search engines | `noindex` meta, `X-Robots-Tag`, robots.txt disallow all | layout, headers |
| Third-party trackers | None. CSP (production) allows only this app, Supabase, YouTube and Loom | `next.config.ts` |
| Secret key exposure | The web app never reads it. Edge Functions get it from the Supabase runtime (`SUPABASE_SECRET_KEYS`) | `_shared/common.ts` |

Test evidence: `supabase/tests/rls_test.sql`, 50 checks. 41 passed on the hosted
project earlier; all 50 pass offline (PGlite). Re-run after `db push`.

## Known limits (accepted or to decide)

- **Shared links still need a login.** A pasted card link only works for
  someone with an account that may see it.
- **Screen recording / downloading from Mega** can't be prevented once an
  editor legitimately opens a link. The audit log shows who opened what.
- **Loom and YouTube links are visible to signed-in editors** (needed to
  embed them). Keep Loom videos restricted to your workspace and YouTube
  previews unlisted.
- **CSP allows inline scripts** (`'unsafe-inline'`), which Next.js and the
  theme switch need. Nonce-based CSP is possible later.
- **Login rate limiting** relies on Supabase Auth's built-in limits.
- **Unknown section URLs** show the "not available" page with HTTP 200
  (streamed rendering); harmless for an internal, noindexed app.

## Before launch (you)

1. `ALLOWED_ORIGINS` secret = the real domain (and remove localhost).
2. Supabase Auth URL configuration: Site URL and redirect URLs = the real domain.
3. Confirm sign-ups and anonymous sign-ins are off; TOTP MFA on.
4. Run the RLS test in the SQL editor and keep the `48 passed` result.
5. Supabase Dashboard → Advisors (security): fix anything it lists.

## Verified vs unverified platform details

Verified against official docs during the build:
Supabase API keys and `SUPABASE_SECRET_KEYS`; RLS performance and
security-definer guidance; MFA aal2 enforcement; column-level privileges;
`db push` flags; functions deploy without Docker (`--use-api`); free-plan
project limit; Next.js 16 proxy and Cache Components; YouTube IFrame API
(states, `seekTo`, 200×200 minimum, `loop` needs `playlist`,
`modestbranding` has no effect, title shows before playback); Roboto/Outfit/
Space Grotesk OFL licences.

Unverified: whether Loom still honours `hide_owner` / `hideEmbedTopBar`
(older reports say Loom strips them); exact dashboard menu labels may change.
