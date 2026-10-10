-- RohTre Vault: admin panel helpers (Stage 5). All require private.is_admin()
-- (active admin profile + 2FA-verified session).

-- Replace a card's filters in one step.
create function private.admin_set_card_filters(p_card uuid, p_filters uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  delete from public.card_filters where card_id = p_card and filter_id <> all (coalesce(p_filters, '{}'));
  insert into public.card_filters (card_id, filter_id)
  select p_card, f from unnest(coalesce(p_filters, '{}')) as f
  on conflict do nothing;
end;
$$;
create function public.admin_set_card_filters(p_card uuid, p_filters uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_card_filters(p_card, p_filters);
$$;

-- Merge filter p_from into p_into: cards and user access move over, then p_from is deleted.
create function private.admin_merge_filters(p_from uuid, p_into uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_from = p_into then
    raise exception 'cannot merge a filter into itself' using errcode = '22023';
  end if;
  insert into public.card_filters (card_id, filter_id)
  select card_id, p_into from public.card_filters where filter_id = p_from
  on conflict do nothing;
  insert into public.user_filter_access (user_id, filter_id)
  select user_id, p_into from public.user_filter_access where filter_id = p_from
  on conflict do nothing;
  delete from public.filters where id = p_from;
  insert into public.audit_log (actor_id, actor_email, action, details)
  select p.id, p.email, 'admin_merge_filters', jsonb_build_object('from', p_from, 'into', p_into)
    from public.profiles p where p.id = (select auth.uid());
end;
$$;
create function public.admin_merge_filters(p_from uuid, p_into uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_merge_filters(p_from, p_into);
$$;

-- Set sort_order from the order of ids (10, 20, 30...).
create function private.admin_reorder(p_kind text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_kind = 'cards' then
    update public.cards c set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where c.id = o.id;
  elsif p_kind = 'sections' then
    update public.sections s set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where s.id = o.id;
  elsif p_kind = 'filter_groups' then
    update public.filter_groups g set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where g.id = o.id;
  elsif p_kind = 'filters' then
    update public.filters f set sort_order = o.n * 10
      from unnest(p_ids) with ordinality as o (id, n) where f.id = o.id;
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;
end;
$$;
create function public.admin_reorder(p_kind text, p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  select private.admin_reorder(p_kind, p_ids);
$$;

-- Link opens per card, for the admin's download counts.
create function private.admin_link_open_counts()
returns table (card_id uuid, opens bigint, last_opened timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select a.card_id, count(*), max(a.created_at)
      from public.audit_log a
     where a.action = 'open_link' and a.card_id is not null
     group by a.card_id;
end;
$$;
create function public.admin_link_open_counts()
returns table (card_id uuid, opens bigint, last_opened timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_link_open_counts();
$$;

revoke all on function public.admin_set_card_filters(uuid, uuid[]) from public, anon;
revoke all on function public.admin_merge_filters(uuid, uuid)      from public, anon;
revoke all on function public.admin_reorder(text, uuid[])          from public, anon;
revoke all on function public.admin_link_open_counts()             from public, anon;
grant execute on function public.admin_set_card_filters(uuid, uuid[]) to authenticated;
grant execute on function public.admin_merge_filters(uuid, uuid)      to authenticated;
grant execute on function public.admin_reorder(text, uuid[])          to authenticated;
grant execute on function public.admin_link_open_counts()             to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
