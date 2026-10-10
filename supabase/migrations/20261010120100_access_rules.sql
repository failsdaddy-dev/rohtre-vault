-- RohTre VideoHub: who can read and write what.
--
-- Plain English:
--   * anon (not signed in) can read nothing.
--   * A signed-in user whose profile is disabled or expired can read nothing,
--     even while their old login token is still valid.
--   * Editors read published cards they are allowed to see: all of them when
--     all_access is on, otherwise only cards carrying one of their filters.
--     Filters, groups, counts and search follow the same rule.
--   * Mega links (card_links.url) are never readable by browser roles. Only
--     the get-asset-link Edge Function can read one, after checking access.
--   * The admin can write content only when signed in with 2FA (aal2).
--     verified: https://supabase.com/docs/guides/auth/auth-mfa
--   * User accounts and access lists are changed only through admin Edge
--     Functions (service role), never directly from the browser.

-- =========================================================== helper functions
create function private.user_is_active(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
  );
$$;

create function private.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.user_is_active((select auth.uid()));
$$;

-- Admin rights need an active admin profile AND a 2FA-verified session.
create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid())
         and p.role = 'admin'
         and p.is_active
         and (p.expires_at is null or p.expires_at > now())
     );
$$;

-- Can this user see this published card? (Drafts are admin-only, see policies.)
create function private.can_view_card(p_card uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.cards c on c.id = p_card
    where p.id = p_user
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
      and c.status = 'published'
      and (
        p.all_access
        or p.role = 'admin'
        or exists (
          select 1
          from public.card_filters cf
          join public.user_filter_access ufa
            on ufa.filter_id = cf.filter_id and ufa.user_id = p.id
          where cf.card_id = c.id
        )
      )
  );
$$;

-- A filter is visible when the user has full access, was granted it, or it
-- appears on a card they can see. Anything else stays undiscoverable.
create function private.can_view_filter(p_filter uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.is_active
      and (p.expires_at is null or p.expires_at > now())
      and (
        p.all_access
        or p.role = 'admin'
        or exists (select 1 from public.user_filter_access u
                   where u.user_id = p.id and u.filter_id = p_filter)
        or exists (select 1 from public.card_filters cf
                   where cf.filter_id = p_filter
                     and private.can_view_card(cf.card_id, p_user))
      )
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ================================================================== grants
-- Supabase grants table rights to anon/authenticated by default; take anon's away
-- entirely, then give authenticated only what the policies below need.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon, public;

grant select on public.profiles, public.user_filter_access, public.audit_log to authenticated;
grant select, insert, update, delete on
  public.sections, public.filter_groups, public.filters, public.cards, public.card_filters
  to authenticated;
-- card_links: browser roles may see that a link exists and its label, never its url.
-- verified: https://supabase.com/docs/guides/database/postgres/column-level-security
grant select (id, card_id, kind, label, sort_order, created_at) on public.card_links to authenticated;
grant insert, update, delete on public.card_links to authenticated;

-- ===================================================================== RLS
alter table public.profiles           enable row level security;
alter table public.sections           enable row level security;
alter table public.filter_groups      enable row level security;
alter table public.filters            enable row level security;
alter table public.cards              enable row level security;
alter table public.card_filters       enable row level security;
alter table public.card_links         enable row level security;
alter table public.user_filter_access enable row level security;
alter table public.audit_log          enable row level security;

-- profiles: your own row, or everyone for the admin. No browser writes.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- user_filter_access: your own grants, or everyone's for the admin. No browser writes.
create policy ufa_select on public.user_filter_access for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- audit_log: admin only. Rows are written by triggers and the Edge Function.
create policy audit_select on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- sections
create policy sections_select on public.sections for select to authenticated
  using ((select private.is_admin()) or (is_visible and (select private.is_active_user())));
create policy sections_admin_insert on public.sections for insert to authenticated
  with check ((select private.is_admin()));
create policy sections_admin_update on public.sections for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy sections_admin_delete on public.sections for delete to authenticated
  using ((select private.is_admin()));

-- filter groups: visible when at least one of their filters is visible
create policy filter_groups_select on public.filter_groups for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.filters f
               where f.group_id = filter_groups.id
                 and private.can_view_filter(f.id, (select auth.uid())))
  );
create policy filter_groups_admin_insert on public.filter_groups for insert to authenticated
  with check ((select private.is_admin()));
create policy filter_groups_admin_update on public.filter_groups for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy filter_groups_admin_delete on public.filter_groups for delete to authenticated
  using ((select private.is_admin()));

-- filters
create policy filters_select on public.filters for select to authenticated
  using ((select private.is_admin()) or private.can_view_filter(id, (select auth.uid())));
create policy filters_admin_insert on public.filters for insert to authenticated
  with check ((select private.is_admin()));
create policy filters_admin_update on public.filters for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy filters_admin_delete on public.filters for delete to authenticated
  using ((select private.is_admin()));

-- cards
create policy cards_select on public.cards for select to authenticated
  using ((select private.is_admin()) or private.can_view_card(id, (select auth.uid())));
create policy cards_admin_insert on public.cards for insert to authenticated
  with check ((select private.is_admin()));
create policy cards_admin_update on public.cards for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy cards_admin_delete on public.cards for delete to authenticated
  using ((select private.is_admin()));

-- card_filters
create policy card_filters_select on public.card_filters for select to authenticated
  using ((select private.is_admin()) or private.can_view_card(card_id, (select auth.uid())));
create policy card_filters_admin_insert on public.card_filters for insert to authenticated
  with check ((select private.is_admin()));
create policy card_filters_admin_delete on public.card_filters for delete to authenticated
  using ((select private.is_admin()));

-- card_links (url column is not granted, see above)
create policy card_links_select on public.card_links for select to authenticated
  using ((select private.is_admin()) or private.can_view_card(card_id, (select auth.uid())));
create policy card_links_admin_insert on public.card_links for insert to authenticated
  with check ((select private.is_admin()));
create policy card_links_admin_update on public.card_links for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy card_links_admin_delete on public.card_links for delete to authenticated
  using ((select private.is_admin()));
