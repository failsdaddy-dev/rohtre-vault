# Supabase setup (hosted project, no Docker)

You do these steps yourself. Never paste passwords or secret keys into the chat.

## Step 0 · Free a project slot
The Free plan allows two active free projects, and paused projects don't count toward that limit.
verified: https://supabase.com/docs/guides/platform/billing-on-supabase
Your account already has two active projects (`Daily-updates-manager` and `rohtremedia-feedback`), so do one of these first:
- **Pause one of them:** Dashboard → open that project → Settings → General → Pause project.
- **Upgrade the organization to Pro:** Dashboard → Organization → Billing.

## Step 1 · Create the project
1. Open https://supabase.com/dashboard/projects and click **New project**.
2. **Name:** `rohtre-videohub`.
3. **Database password:** click **Generate a password**, then save it in your password manager. You'll need it in Step 4.
4. **Region:** South Asia (Mumbai). **Plan:** Free.
5. Click **Create new project** and wait until it shows as healthy.
6. Copy the **project ref**. It's the part after `/project/` in the browser address bar (20 lowercase letters). The ref isn't secret, so you can tell it to Claude.

## Step 2 · Auth settings
Open https://supabase.com/dashboard/project/_/auth/providers (pick the project when asked).
verified: https://supabase.com/docs/guides/auth/general-configuration
- Turn **Allow new users to sign up** OFF.
- Turn **Allow anonymous sign-ins** OFF.
- Leave the **Email** provider enabled.
- Click **Save**.

## Step 3 · API keys → `.env.local`
1. Open Settings → **API Keys** (https://supabase.com/dashboard/project/_/settings/api-keys).
   verified: https://supabase.com/docs/guides/api/api-keys
2. In the project folder, copy `.env.example` to `.env.local`.
3. Fill in the **Project URL** and the **publishable key** (`sb_publishable_...`).
4. Don't copy the secret key anywhere.

## Step 4 · Connect the CLI (run in Claude Code's prompt with `!`)
```
! npx supabase login
! npx supabase link --project-ref YOUR_PROJECT_REF
```
- `login` opens your browser. Approve the request there.
- `link` asks for the database password from Step 1. Type it in; nothing shows as you type.

## Step 5 · Tell Claude "linked"
Claude then:
1. Shows the dry run: `npx supabase db push --linked --dry-run`.
2. Pushes the migrations and seed: `npx supabase db push --linked --include-seed`.
3. Runs `supabase/tests/rls_test.sql` on the hosted database. All test data rolls back.
4. Generates the TypeScript types.

## Step 6 · First admin (after Step 5)
1. Open Authentication → Users → **Add user** → **Create new user**.
2. Enter your email and a strong password, and tick **Auto Confirm User**.
3. Run this in the SQL editor, using your own email:
   ```sql
   update public.profiles
      set role = 'admin', all_access = true, must_change_password = false
    where email = 'you@example.com';
   ```
4. Sign in with that email and password. There is no 2FA step.
