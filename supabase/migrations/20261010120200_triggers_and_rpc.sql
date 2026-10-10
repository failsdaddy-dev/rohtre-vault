-- RohTre VideoHub: triggers and the functions the app calls.

-- =================================================================== triggers

-- New auth user -> profile. Role is always 'editor' here; user metadata is
-- user-editable, so it is never trusted for role or access.
-- verified: https://supabase.com/docs/guides/auth/managing-user-data
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Every successful sign-in updates last_sign_in_at -> audit "login".
create function private.handle_user_login()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    insert into public.audit_log (actor_id, actor_email, action)
    values (new.id, new.email, 'login');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute function private.handle_user_login();

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger cards_touch before update on public.cards
  for each row execute function private.touch_updated_at();

create function private.cards_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger cards_before_write before insert or update on public.cards
  for each row execute function private.cards_before_write();

-- Keep has_project_files / has_downloads in step with card_links.
create function private.sync_card_link_flags()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_card uuid := coalesce(new.card_id, old.card_id);
begin
  update public.cards c set
    has_project_files = exists (select 1 from public.card_links l where l.card_id = v_card and l.kind = 'project'),
    has_downloads     = exists (select 1 from public.card_links l where l.card_id = v_card and l.kind = 'download')
  where c.id = v_card;
  if tg_op = 'UPDATE' and old.card_id is distinct from new.card_id then
    update public.cards c set
      has_project_files = exists (select 1 from public.card_links l where l.card_id = old.card_id and l.kind = 'project'),
      has_downloads     = exists (select 1 from public.card_links l where l.card_id = old.card_id and l.kind = 'download')
    where c.id = old.card_id;
  end if;
  return null;
end;
$$;
create trigger card_links_sync_flags
  after insert or update or delete on public.card_links
  for each row execute function private.sync_card_link_flags();

-- Keep cards.filter_text (used by search) in step with the card's filters.
create function private.refresh_card_filter_text(p_card uuid)
returns void language sql security definer set search_path = '' as $$
  update public.cards c set filter_text = coalesce((
    select string_agg(f.name, ' ' order by f.name)
    from public.card_filters cf join public.filters f on f.id = cf.filter_id
    where cf.card_id = p_card), '')
  where c.id = p_card;
$$;

create function private.card_filters_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_card_filter_text(coalesce(new.card_id, old.card_id));
  return null;
end;
$$;
create trigger card_filters_refresh_search
  after insert or delete on public.card_filters
  for each row execute function private.card_filters_changed();

create function private.filter_renamed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_card_filter_text(cf.card_id)
  from public.card_filters cf where cf.filter_id = new.id;
  return null;
end;
$$;
create trigger filters_refresh_search
  after update of name on public.filters
  for each row execute function private.filter_renamed();

-- ===================================================== browse (RLS applies)
-- One call powers the grid, search and infinite scroll.
--   Filters: OR inside a group, AND across groups (Phase 0, Q12).
--   An unknown or hidden filter slug returns nothing, so a scoped link can
--   never widen into content outside its scope.
--   Cursor: pass the last row's sort_ts / sort_num and id back as p_after_*.
create function public.browse_cards(
  p_section        text    default null,
  p_filters        text[]  default '{}',
  p_q              text    default null,
  p_sort           text    default 'newest',   -- newest | manual | relevance
  p_after_ts       timestamptz      default null,
  p_after_num      double precision default null,
  p_after_id       uuid    default null,
  p_limit          int     default 24,
  p_include_drafts boolean default false       -- admin preview only; RLS still decides
)
returns table (
  id uuid, section_slug text, slug text, title text, description text,
  youtube_id text, preview_start int, preview_end int, loom_url text, source_url text,
  has_project_files boolean, has_downloads boolean, status public.card_status,
  filter_slugs text[], sort_ts timestamptz, sort_num double precision
)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_slugs  text[] := coalesce((select array_agg(distinct lower(btrim(s))) from unnest(p_filters) s
                               where btrim(coalesce(s, '')) <> ''), '{}');
  v_ids    uuid[];
  v_groups uuid[];
  v_found  int;
  v_q      text := nullif(btrim(coalesce(p_q, '')), '');
  v_tsq    tsquery;
  v_limit  int := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_sort   text := case
                     when p_sort = 'relevance' and nullif(btrim(coalesce(p_q, '')), '') is not null then 'relevance'
                     when p_sort = 'manual' then 'manual'
                     else 'newest' end;
begin
  if cardinality(v_slugs) > 0 then
    select array_agg(f.id), array_agg(distinct f.group_id), count(*)
      into v_ids, v_groups, v_found
      from public.filters f where f.slug = any (v_slugs);
    if v_found < cardinality(v_slugs) then
      return;
    end if;
  end if;

  if v_q is not null then
    select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & '))
      into v_tsq
      from regexp_split_to_table(
             lower(regexp_replace(left(v_q, 200), '[^[:alnum:][:space:]]+', ' ', 'g')),
             '[[:space:]]+') as w
     where w <> '';
  end if;

  return query
  select c.id, s.slug, c.slug, c.title, c.description,
         c.youtube_id, c.preview_start, c.preview_end, c.loom_url, c.source_url,
         c.has_project_files, c.has_downloads, c.status,
         coalesce((select array_agg(f.slug order by f.sort_order, f.name)
                     from public.card_filters cf join public.filters f on f.id = cf.filter_id
                    where cf.card_id = c.id), '{}'::text[]),
         k.ts,
         k.num
    from public.cards c
    join public.sections s on s.id = c.section_id
    cross join lateral (
      select coalesce(c.published_at, c.created_at) as ts,
             case v_sort
               when 'manual'    then c.sort_order::double precision
               when 'relevance' then (case when v_tsq is null then 0 else ts_rank(c.search_tsv, v_tsq) end
                                      + extensions.word_similarity(v_q, c.title))::double precision
               else 0::double precision
             end as num
    ) k
   where (p_section is null or s.slug = p_section)
     and (c.status = 'published' or p_include_drafts)
     and (v_q is null
          or (v_tsq is not null and c.search_tsv @@ v_tsq)
          or extensions.word_similarity(v_q, c.title) >= 0.5)            -- light typo tolerance
     and (v_groups is null or not exists (
            select 1 from unnest(v_groups) as g(group_id)
             where not exists (
               select 1 from public.card_filters cf
                 join public.filters f on f.id = cf.filter_id
                where cf.card_id = c.id and f.group_id = g.group_id and f.id = any (v_ids))))
     and (p_after_id is null or case v_sort
            when 'newest' then (k.ts, c.id) < (p_after_ts, p_after_id)
            when 'manual' then (k.num, c.id) > (p_after_num, p_after_id)
            else               (k.num, c.id) < (p_after_num, p_after_id) end)
   order by
     case when v_sort = 'newest'    then k.ts  end desc,
     case when v_sort = 'relevance' then k.num end desc,
     case when v_sort = 'manual'    then k.num end asc,
     case when v_sort = 'manual'    then c.id  end asc,
     case when v_sort <> 'manual'   then c.id  end desc
   limit v_limit;
end;
$$;

-- Counts per visible filter for the "More filters" panel, within a section.
-- RLS applies, so counts only include cards the caller can see.
create function public.filter_counts(p_section text default null)
returns table (filter_id uuid, card_count bigint)
language sql stable security invoker set search_path = '' as $$
  select cf.filter_id, count(*)
    from public.card_filters cf
    join public.cards c    on c.id = cf.card_id and c.status = 'published'
    join public.sections s on s.id = c.section_id
   where p_section is null or s.slug = p_section
   group by cf.filter_id;
$$;

-- ============================================== small self-service actions
create function private.mark_password_changed()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set must_change_password = false where id = (select auth.uid());
$$;
create function public.mark_password_changed()
returns void language sql security invoker set search_path = '' as $$
  select private.mark_password_changed();
$$;

-- ======================================================== admin link editing
-- The admin reads and replaces a card's Mega links through these, because
-- the url column is never granted to browser roles.
create function private.admin_card_links(p_card uuid)
returns table (id uuid, kind public.link_kind, label text, url text, sort_order int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select l.id, l.kind, l.label, l.url, l.sort_order
      from public.card_links l where l.card_id = p_card
     order by l.kind, l.sort_order, l.label;
end;
$$;
create function public.admin_card_links(p_card uuid)
returns table (id uuid, kind public.link_kind, label text, url text, sort_order int)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_card_links(p_card);
$$;

-- p_links: [{"kind":"project","label":"Premiere Pro","url":"https://mega.nz/..."}, ...]
create function private.admin_save_card_links(p_card uuid, p_links jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_links) <> 'array' then
    raise exception 'p_links must be a JSON array' using errcode = '22023';
  end if;
  delete from public.card_links where card_id = p_card;
  insert into public.card_links (card_id, kind, label, url, sort_order)
  select p_card, (e ->> 'kind')::public.link_kind, btrim(e ->> 'label'), btrim(e ->> 'url'), o::int - 1
    from jsonb_array_elements(p_links) with ordinality as t(e, o);
end;
$$;
create function public.admin_save_card_links(p_card uuid, p_links jsonb)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_save_card_links(p_card, p_links);
$$;

-- ===================================================== link release (server)
-- Called only by the get-asset-link Edge Function (service role) after it has
-- verified the caller's login. Checks access, writes the audit row, returns url.
create function public.release_asset_link(p_user uuid, p_link uuid)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_card  uuid;
  v_url   text;
  v_kind  public.link_kind;
  v_label text;
  v_email text;
  v_ok    boolean;
begin
  select l.card_id, l.url, l.kind, l.label into v_card, v_url, v_kind, v_label
    from public.card_links l where l.id = p_link;
  select p.email into v_email from public.profiles p where p.id = p_user;

  v_ok := v_card is not null and (
            private.can_view_card(v_card, p_user)
            or exists (select 1 from public.profiles p
                        where p.id = p_user and p.role = 'admin'
                          and private.user_is_active(p_user)));

  insert into public.audit_log (actor_id, actor_email, action, card_id, link_id, details)
  values (p_user, v_email,
          case when v_ok then 'open_link' else 'open_link_denied' end,
          case when v_ok then v_card end,
          case when v_ok then p_link end,
          jsonb_build_object('kind', v_kind, 'label', v_label, 'requested_link', p_link));

  return case when v_ok then v_url end;
end;
$$;

-- ==================================================================== grants
revoke all on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean) from public, anon;
revoke all on function public.filter_counts(text)                 from public, anon;
revoke all on function public.mark_password_changed()             from public, anon;
revoke all on function public.admin_card_links(uuid)              from public, anon;
revoke all on function public.admin_save_card_links(uuid, jsonb)  from public, anon;
revoke all on function public.release_asset_link(uuid, uuid)      from public, anon, authenticated;

grant execute on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean) to authenticated;
grant execute on function public.filter_counts(text)                to authenticated;
grant execute on function public.mark_password_changed()            to authenticated;
grant execute on function public.admin_card_links(uuid)             to authenticated;
grant execute on function public.admin_save_card_links(uuid, jsonb) to authenticated;
grant execute on function public.release_asset_link(uuid, uuid)     to service_role;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- Links are written only through admin_save_card_links.
revoke insert, update, delete on public.card_links from authenticated;
