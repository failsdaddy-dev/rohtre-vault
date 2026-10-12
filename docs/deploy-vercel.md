# Deploy on Vercel

The app is a standard Next.js project, so Vercel needs no `vercel.json`.
Only two public environment variables are needed; the Supabase secret key is
never used by the web app.

## 1. Import the repo
1. vercel.com → **Add New… → Project** → import
   `failsdaddy-dev/rohtre-vault` from GitHub.
2. Framework preset: **Next.js** (detected). Root directory: the repo root.
   Build command `npm run build`, install command `npm install` (defaults).
3. Production branch: `main`.

## 2. Environment variables
Settings → Environment Variables, for **Production** and **Preview**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

Copy them from your `.env.local` (Supabase Dashboard → Settings → API Keys).
They are read at **build time** (also for the Content Security Policy), so
redeploy after changing them. Without them the site runs in sample mode.

## 3. Deploy
Click **Deploy**. Note the address, e.g. `https://rohtre-vault.vercel.app`
(or your own domain once added under Settings → Domains).

## 4. Point Supabase at the live address
Replace `https://rohtre-vault.vercel.app` with your real address.

1. **Auth → URL Configuration**
   - Site URL: `https://rohtre-vault.vercel.app`
   - Redirect URLs: add `https://rohtre-vault.vercel.app/**`
2. **Edge Function CORS** (your PowerShell, in the repo folder):
   ```powershell
   npx supabase secrets set ALLOWED_ORIGINS=https://rohtre-vault.vercel.app
   ```
   Comma-separate several addresses if needed (e.g. a custom domain too).
   Without this, Project files / Download and all admin user actions fail on
   the live site.
3. Make sure these are applied (once):
   ```powershell
   npx supabase db push --linked
   npx supabase functions deploy get-asset-link --use-api
   npx supabase functions deploy admin-create-user --use-api
   npx supabase functions deploy admin-manage-user --use-api
   ```

## 5. Check the live site
- Landing page plays the intro, `/login` signs in with email and password.
- Open a card's Project files / Download (needs step 4.2).
- Admin → Users → Add user works (needs step 4.2).
- Run `supabase/tests/rls_test.sql` in the SQL editor: 50 passed, 0 failed.
- Supabase Dashboard → Advisors → Security: nothing open.
