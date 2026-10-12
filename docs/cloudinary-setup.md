# Cloudinary setup (preview files)

RohTre Vault shows **previews**; the real files stay on **Mega** (Project
files / Download buttons). Cloudinary holds only two kinds of small preview:

| Card | Preview on Cloudinary | Limit | Shown as |
|---|---|---|---|
| Video cards (Effects, Backgrounds, …) | Silent clip (MP4, WebM or MOV) | 10 s, 2 MB | Clean loop on the card, no player buttons; click = full YouTube video with sound |
| Music cards | MP3 preview | 30 s, 1 MB | Site audio player, 30 s max; Download = full track from Mega |

Tips: export MP3 previews at 128–192 kbps (30 s ≈ 0.5–0.7 MB). Export clips
at 720p or less; the site asks Cloudinary for a 480 px, sound-free copy for
the cards (Cloudinary's 9 MB demo clip comes back as ~0.24 MB).

## 1. Create the account
1. Sign up at https://cloudinary.com (free plan, no card).
2. In the Console, open **Settings → API Keys** and note:
   **Cloud name**, **API key**, **API secret** (treat it like a password).

No upload preset is needed: uploads are signed by our
`cloudinary-sign-upload` function.

## 2. Give the three values to Supabase (not to the website)
In your PowerShell, in the project folder:
```powershell
npx supabase secrets set CLOUDINARY_CLOUD_NAME=your-cloud-name
npx supabase secrets set CLOUDINARY_API_KEY=your-api-key
npx supabase secrets set CLOUDINARY_API_SECRET=your-api-secret
```
Never put them in `.env.local`, in Vercel, or in a `NEXT_PUBLIC_*` variable.

## 3. Apply the database change and deploy the functions
```powershell
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy cloudinary-sign-upload --use-api
npx supabase functions deploy cloudinary-delete-preview --use-api
npx supabase functions deploy get-asset-link --use-api
npx supabase functions deploy admin-create-user --use-api
npx supabase functions deploy admin-manage-user --use-api
```
Then paste `supabase/tests/rls_test.sql` into the SQL Editor and run it. It
should end with `RLS TEST RESULTS: N passed, 0 failed`.

## How it works
- The admin picks a file; the browser checks type, size and length (and reads
  the MP3's waveform), then uploads it **straight to Cloudinary** with a
  signature from `cloudinary-sign-upload` (admin only). Files land in
  `rohtre-vault/previews/` or `rohtre-vault/music/` with random names.
- Saving the card stores the file's address and details on the card. The
  database refuses previews over the limits or from anywhere but Cloudinary.
- Previews are **public files with unguessable names**: anyone who has the
  address can open that preview. They are previews only; the real files
  stay on Mega behind the access-checked, logged buttons.
- Replace / remove a preview, delete a card, or leave the form without
  saving: `cloudinary-delete-preview` removes the old file (it refuses files
  a card still uses). Deleting a card any other way (SQL, Supabase
  dashboard) leaves its preview on Cloudinary.

## Free plan (checked 2026-10-12)
- 25 credits a month; 1 credit = 1 GB storage **or** 1 GB bandwidth **or**
  1,000 transformations. verified: https://cloudinary.com/documentation/billing_and_plans
- Example: 500 clips × ~1.5 MB + 300 MP3s × ~0.7 MB ≈ 1 GB storage
  (1 credit), leaving ~24 GB of viewing a month. Card clips are served at
  ~0.25–0.5 MB each, and browsers cache them.
- Usage: Console → Dashboard (credits), Settings → Usage (details),
  Assets → rohtre-vault (the files).
