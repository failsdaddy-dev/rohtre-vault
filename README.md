# RohTre Vault

Private, YouTube-style library of the studio's approved effects, music, sound
effects, fonts and text presets. Editors preview a card, watch its Loom
tutorial and open its project files or download (Mega links). Only the admin
creates accounts, and each editor can be limited to certain filters.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres
with RLS, Auth, Edge Functions). Font: Space Grotesk (SIL Open Font License).

## Run it locally

```powershell
cd C:\Agents\rohtre-vault
npm install
npm run dev
```

Open http://localhost:3000.

- **Without `.env.local`** the app runs in *sample mode*: sample cards, no
  login, admin panel disabled. Good for looking at the design.
- **With `.env.local`** it uses your Supabase project and requires sign-in.

Production-style run: `npm run build` then `npm start`. `NEXT_PUBLIC_*` values
are baked in at build time, so rebuild after changing `.env.local`.

Checks: `npm test` (unit tests) · `npx tsc --noEmit` · `npm run lint`.

## Connect Supabase (one time)

All commands run in **your own PowerShell window** in this folder (the CLI
needs an interactive terminal). Never paste keys or passwords into chat.

1. **`.env.local`** – copy `.env.example` to `.env.local` and fill in the
   Project URL and the **publishable** key from Dashboard → Settings → API Keys.
   Do not put the secret key anywhere in this app.

2. **Database** – push the migrations (one new one since the first push):
   ```powershell
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   ```

3. **Edge Functions** (no Docker needed; deploys through the API):
   ```powershell
   npx supabase functions deploy get-asset-link --use-api
   npx supabase functions deploy admin-create-user --use-api
   npx supabase functions deploy admin-manage-user --use-api
   ```
   Allowed browser origins (add your real domain at launch, comma separated):
   ```powershell
   npx supabase secrets set ALLOWED_ORIGINS=http://localhost:3000
   ```

4. **Auth settings** (Dashboard → Authentication):
   - Sign In / Providers: *Allow new users to sign up* **off**, anonymous sign-ins **off**.
   - Multi-Factor: **TOTP (authenticator app)** enabled.
   - URL Configuration: Site URL `http://localhost:3000` for now.

5. **First admin** – Authentication → Users → *Add user* → *Create new user*
   (tick *Auto Confirm User*), then in the SQL editor:
   ```sql
   update public.profiles
      set role = 'admin', all_access = true, must_change_password = false
    where email = 'you@example.com';
   ```
   Sign in at http://localhost:3000/login. Open **Admin → 2FA**, scan the QR
   code with an authenticator app and enter the code. Admin tools unlock only
   in a 2FA-verified session (the database enforces this).

6. **Access tests** – paste `supabase/tests/rls_test.sql` into the SQL editor
   and run it. A red message `RLS TEST RESULTS: 50 passed, 0 failed` is the
   success case; it rolls all test data back.

## Deploy on Vercel

See [docs/deploy-vercel.md](docs/deploy-vercel.md): import the GitHub repo,
add the two `NEXT_PUBLIC_SUPABASE_*` variables, deploy, then set the Supabase
Auth URLs and the `ALLOWED_ORIGINS` secret to the live address.

## How access works

- Nothing is readable without signing in. Disabled or expired accounts lose
  access at once, even with a still-valid session (RLS checks `is_active`
  and the expiry date; disabling also bans the login).
- Senior editors get **All access**. Others see only cards carrying at least
  one of their filters – in the grid, search, filter lists, counts and direct
  links alike.
- Mega links never reach the browser until a click. `get-asset-link` checks
  access, writes the audit log, then returns the one link.
- Admin writes require an active admin, plus a code-verified session while
  admin 2FA is switched on (Admin → 2FA).

## Folders

```
src/app/              routes (proxy.ts refreshes the session, sends guests to /login)
src/app/(hub)/        signed-in area: sections, card pages, admin panel
src/components/       UI (top bar, guide, chips, cards, player, admin/*)
src/lib/              data sources, URL state, auth, Supabase clients
supabase/migrations/  schema + RLS + functions (SQL)
supabase/functions/   Edge Functions (Deno)
supabase/tests/       RLS test (SQL)
tests/                unit tests (Vitest)
docs/                 Loom transcript, setup guide, admin guide
```

See `docs/admin-guide.md` for day-to-day use.
