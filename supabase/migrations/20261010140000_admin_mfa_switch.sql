-- RohTre Vault: admin 2FA becomes a switch the admin controls.
--   2FA on  (a verified factor exists) -> admin writes need a 2FA-verified session (aal2).
--   2FA off (no verified factor)       -> admin writes work with the password session.
-- Turning 2FA off requires an aal2 session (Supabase rule for removing a
-- verified factor), so a stolen password alone can never switch it off.

create or replace function private.user_has_mfa(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = p_user and f.status = 'verified'
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.profiles p
           where p.id = (select auth.uid())
             and p.role = 'admin'
             and p.is_active
             and (p.expires_at is null or p.expires_at > now())
         )
     and (
           coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
           or not private.user_has_mfa((select auth.uid()))
         );
$$;

revoke all on function private.user_has_mfa(uuid) from public, anon;
grant execute on function private.user_has_mfa(uuid) to authenticated, service_role;
