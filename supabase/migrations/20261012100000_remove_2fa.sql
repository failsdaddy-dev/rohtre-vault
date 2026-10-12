-- RohTre Vault: 2FA removed. Sign-in is email + password only.
-- Admin rights need only an active admin profile; the session's aal no
-- longer matters. Existing authenticator factors are deleted so no account
-- is left half set up.

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
  );
$$;

drop function if exists private.user_has_mfa(uuid);

delete from auth.mfa_factors;
