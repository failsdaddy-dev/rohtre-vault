-- RohTre VideoHub: access-rule tests.
--
-- Runs as one DO block against a database that has the migrations applied.
-- It creates throwaway users and cards, checks what each role can see, and
-- ENDS BY RAISING AN EXCEPTION that carries the results. The exception rolls
-- everything back, so nothing is left behind. A "RLS TEST RESULTS: N passed,
-- 0 failed" error message is the success case.
--
-- No Docker needed: run it in the SQL editor, or through the Supabase MCP
-- execute_sql tool.

do $test$
declare
  u_admin uuid := gen_random_uuid();
  u_senior uuid := gen_random_uuid();
  u_restricted uuid := gen_random_uuid();
  u_disabled uuid := gen_random_uuid();
  u_expired uuid := gen_random_uuid();
  sec uuid; g_client uuid; g_style uuid;
  f_ped uuid; f_cartoon uuid; f_fc20 uuid;
  c1 uuid; c2 uuid; c3 uuid; l1 uuid; l2 uuid;
  n int; t text; ok boolean;
  names text[] := '{}'; oks boolean[] := '{}';
  report text := ''; passed int := 0; failed int := 0; i int;
begin
  -- ------------------------------------------------------------ fixtures
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         email, '{}'::jsonb, now(), now()
  from (values (u_admin, 'zz-admin@test.local'), (u_senior, 'zz-senior@test.local'),
               (u_restricted, 'zz-restricted@test.local'), (u_disabled, 'zz-disabled@test.local'),
               (u_expired, 'zz-expired@test.local')) as v (id, email);

  update public.profiles set role = 'admin' where id = u_admin;
  update public.profiles set all_access = true where id in (u_senior, u_disabled, u_expired);
  update public.profiles set is_active = false where id = u_disabled;
  update public.profiles set expires_at = now() - interval '1 day' where id = u_expired;

  insert into public.sections (slug, name, kind) values ('zz-test-sec', 'Zz test', 'effect') returning id into sec;
  insert into public.filter_groups (slug, name) values ('zz-test-client', 'Zz client') returning id into g_client;
  insert into public.filter_groups (slug, name) values ('zz-test-style', 'Zz style') returning id into g_style;
  insert into public.filters (group_id, slug, name) values (g_client, 'zz-test-ped', 'Zzped') returning id into f_ped;
  insert into public.filters (group_id, slug, name) values (g_style, 'zz-test-cartoon', 'Zzcartoonfilter') returning id into f_cartoon;
  insert into public.filters (group_id, slug, name) values (g_style, 'zz-test-fc20', 'Zzfc20') returning id into f_fc20;
  insert into public.user_filter_access (user_id, filter_id) values (u_restricted, f_ped);

  insert into public.cards (section_id, slug, title, status) values (sec, 'q-mark', 'Zz question mark pop', 'published') returning id into c1;
  insert into public.cards (section_id, slug, title, status) values (sec, 'tv-doc', 'Zz tv documentary', 'published') returning id into c2;
  insert into public.cards (section_id, slug, title, status) values (sec, 'draft', 'Zz draft card', 'draft') returning id into c3;
  insert into public.card_filters values (c1, f_ped), (c1, f_cartoon), (c2, f_cartoon), (c2, f_fc20), (c3, f_ped);
  insert into public.card_links (card_id, kind, label, url) values (c1, 'project', 'Premiere Pro', 'https://mega.nz/file/zz-one') returning id into l1;
  insert into public.card_links (card_id, kind, label, url) values (c2, 'download', 'Transparent .mov', 'https://mega.nz/file/zz-two') returning id into l2;
  update public.cards set media_type = 'audio',
         audio_preview = '{"url":"https://res.cloudinary.com/zz/video/upload/v1/rohtre-vault/music/zz-one.mp3","public_id":"rohtre-vault/music/zz-one","version":1,"format":"mp3","bytes":500000,"duration":30}'
   where id = c1;

  -- ---------------------------------------------------- triggers worked
  select count(*) into n from public.cards where id = c1 and has_project_files and not has_downloads;
  names := array_append(names, ('has_project_files flag set from card_links')::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.cards where id = c2 and has_downloads and not has_project_files;
  names := array_append(names, ('has_downloads flag set from card_links')::text); oks := array_append(oks, ((n = 1))::boolean);
  -- preview limits hold even if the admin form is bypassed
  begin
    update public.cards set audio_preview = jsonb_set(audio_preview, '{bytes}', '2000000') where id = c1; ok := false;
  exception when check_violation then ok := true; end;
  names := array_append(names, ('audio preview over 1 MB is refused')::text); oks := array_append(oks, (ok)::boolean);
  begin
    update public.cards set audio_preview = jsonb_set(audio_preview, '{duration}', '95') where id = c1; ok := false;
  exception when check_violation then ok := true; end;
  names := array_append(names, ('audio preview over 30 seconds is refused')::text); oks := array_append(oks, (ok)::boolean);
  begin
    update public.cards set preview_clip = '{"url":"https://evil.example/x.mp4","public_id":"rohtre-vault/previews/x","bytes":1000,"duration":5}' where id = c2; ok := false;
  exception when check_violation then ok := true; end;
  names := array_append(names, ('preview clip must come from Cloudinary')::text); oks := array_append(oks, (ok)::boolean);
  update auth.users set last_sign_in_at = now() where id = u_restricted;
  select count(*) into n from public.audit_log where actor_id = u_restricted and action = 'login';
  names := array_append(names, ('sign-in writes a login audit row')::text); oks := array_append(oks, ((n = 1))::boolean);

  -- --------------------------------------------------------------- anon
  begin
    execute 'set local role anon';
    perform 1 from public.cards limit 1;
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  execute 'reset role';
  names := array_append(names, ('anon cannot read cards at all')::text); oks := array_append(oks, (ok)::boolean);

  -- ----------------------------------------------------- senior (all access)
  perform set_config('request.jwt.claims', json_build_object('sub', u_senior, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cards where section_id = sec;
  names := array_append(names, (format('senior sees both published cards, not the draft (got %s, want 2)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['zz-test-cartoon']);
  names := array_append(names, (format('filter Cartoon -> 2 cards (got %s)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['zz-test-cartoon', 'zz-test-fc20']);
  names := array_append(names, (format('same group = OR: Cartoon + FC20 -> 2 (got %s)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['zz-test-ped', 'zz-test-fc20']);
  names := array_append(names, (format('different groups = AND: PED + FC20 -> 0 (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['zz-test-ped', 'zz-test-cartoon']);
  names := array_append(names, (format('different groups = AND: PED + Cartoon -> 1 (got %s)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_q => 'questi');
  names := array_append(names, (format('search prefix "questi" finds the question-mark card (got %s)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_q => 'zzcartoonfilter');
  names := array_append(names, (format('search matches filter names (got %s, want 2)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['no-such-filter']);
  names := array_append(names, (format('unknown filter in URL returns nothing (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);
  execute 'reset role';

  -- --------------------------------------------------- restricted (PED only)
  perform set_config('request.jwt.claims', json_build_object('sub', u_restricted, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cards where section_id = sec;
  names := array_append(names, (format('restricted sees only the PED card (got %s, want 1)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.cards where id = c2;
  names := array_append(names, ('restricted cannot open a non-PED card by id')::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.cards where id = c3;
  names := array_append(names, ('restricted cannot see a draft, even with PED')::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_q => 'documentary');
  names := array_append(names, (format('restricted search cannot find the non-PED card (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.browse_cards(p_section => 'zz-test-sec', p_filters => array['zz-test-fc20']);
  names := array_append(names, (format('restricted link with a hidden filter shows nothing (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.filters where id = f_fc20;
  names := array_append(names, ('restricted cannot discover a filter used only outside their scope')::text); oks := array_append(oks, ((n = 0))::boolean);
  select count(*) into n from public.filters where id in (f_ped, f_cartoon);
  names := array_append(names, (format('restricted sees their own filter and filters on visible cards (got %s, want 2)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select count(*) into n from public.filter_groups where id in (g_client, g_style);
  names := array_append(names, (format('restricted sees only groups with visible filters (got %s, want 2)', n))::text); oks := array_append(oks, ((n = 2))::boolean);
  select coalesce(sum(card_count), 0) into n from public.filter_counts('zz-test-sec') where filter_id = f_cartoon;
  names := array_append(names, (format('restricted counts include only visible cards (got %s, want 1)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.card_links where card_id in (c1, c2);
  names := array_append(names, (format('restricted sees link labels only for visible cards (got %s, want 1)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.profiles;
  names := array_append(names, (format('restricted sees only their own profile (got %s)', n))::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.audit_log;
  names := array_append(names, ('restricted cannot read the audit log')::text); oks := array_append(oks, ((n = 0))::boolean);
  execute 'reset role';

  -- restricted: things that must be refused outright
  perform set_config('request.jwt.claims', json_build_object('sub', u_restricted, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  begin execute 'set local role authenticated'; perform url from public.card_links limit 1; ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('browser roles cannot select card_links.url')::text); oks := array_append(oks, (ok)::boolean);

  begin execute 'set local role authenticated'; perform public.release_asset_link(u_restricted, l1); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot call release_asset_link directly')::text); oks := array_append(oks, (ok)::boolean);

  begin execute 'set local role authenticated'; perform * from public.admin_card_links(c1); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot call admin_card_links')::text); oks := array_append(oks, (ok)::boolean);

  execute 'set local role authenticated';
  select count(*) into n from public.browse_cards('zz-test-sec') b where b.audio_preview is not null;
  execute 'reset role';
  names := array_append(names, (format('list carries the audio preview of a visible card (got %s, want 1)', n))::text); oks := array_append(oks, ((n = 1))::boolean);

  begin execute 'set local role authenticated';
    insert into public.cards (section_id, slug, title) values (sec, 'hack', 'Zz hack'); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot create cards')::text); oks := array_append(oks, (ok)::boolean);

  begin execute 'set local role authenticated';
    update public.profiles set all_access = true where id = u_restricted; ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot change their own access')::text); oks := array_append(oks, (ok)::boolean);

  begin execute 'set local role authenticated';
    insert into public.user_filter_access values (u_restricted, f_fc20); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot grant themselves filters')::text); oks := array_append(oks, (ok)::boolean);

  -- ------------------------------------------------ disabled and expired
  perform set_config('request.jwt.claims', json_build_object('sub', u_disabled, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cards where section_id = sec;
  execute 'reset role';
  names := array_append(names, (format('disabled user (still holding a token) sees nothing (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);

  perform set_config('request.jwt.claims', json_build_object('sub', u_expired, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cards where section_id = sec;
  select count(*) + n into n from public.sections where id = sec;
  execute 'reset role';
  names := array_append(names, (format('expired user sees nothing (got %s)', n))::text); oks := array_append(oks, ((n = 0))::boolean);

  -- --------------------------------------------------------------- admin
  -- 2FA was removed (2026-10-12): the admin's password session is enough.
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  insert into public.cards (section_id, slug, title) values (sec, 'a2', 'Zz admin card');
  select count(*) into n from public.cards where section_id = sec;
  names := array_append(names, (format('admin (password session) can write and sees drafts (got %s, want 4)', n))::text); oks := array_append(oks, ((n = 4))::boolean);
  execute 'reset role';
  -- A plain editor never becomes admin.
  perform set_config('request.jwt.claims', json_build_object('sub', u_restricted, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  begin execute 'set local role authenticated';
    insert into public.cards (section_id, slug, title) values (sec, 'hack2', 'Zz hack2'); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor still cannot write')::text); oks := array_append(oks, (ok)::boolean);

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.admin_card_links(c1);
  names := array_append(names, ('admin can read Mega links for editing')::text); oks := array_append(oks, ((n = 1))::boolean);
  perform public.admin_save_card_links(c2, '[{"kind":"project","label":"After Effects","url":"https://mega.nz/file/zz-three"}]'::jsonb);
  select count(*) into n from public.cards where id = c2 and has_project_files and not has_downloads;
  names := array_append(names, ('admin_save_card_links replaces links and updates flags')::text); oks := array_append(oks, ((n = 1))::boolean);
  update public.cards set preview_clip = '{"url":"https://res.cloudinary.com/zz/video/upload/v1/rohtre-vault/previews/zz.mp4","public_id":"rohtre-vault/previews/zz","version":1,"format":"mp4","bytes":1500000,"duration":8}' where id = c2;
  select count(*) into n from public.cards where id = c2 and preview_clip is not null;
  names := array_append(names, ('admin can set a preview clip')::text); oks := array_append(oks, ((n = 1))::boolean);
  execute 'reset role';

  -- ---------------------------------------- link release (Edge Function path)
  execute 'set local role service_role';
  t := public.release_asset_link(u_restricted, l1);
  names := array_append(names, ('release_asset_link returns the url for an allowed card')::text); oks := array_append(oks, ((t = 'https://mega.nz/file/zz-one'))::boolean);
  select l.id into l2 from public.card_links l where l.card_id = c2 limit 1;
  t := public.release_asset_link(u_restricted, l2);
  names := array_append(names, ('release_asset_link refuses a card outside scope')::text); oks := array_append(oks, ((t is null))::boolean);
  t := public.release_asset_link(u_disabled, l1);
  names := array_append(names, ('release_asset_link refuses a disabled user')::text); oks := array_append(oks, ((t is null))::boolean);
  execute 'reset role';
  select count(*) into n from public.audit_log where actor_id = u_restricted and action = 'open_link' and link_id = l1;
  names := array_append(names, ('allowed link open is audited')::text); oks := array_append(oks, ((n = 1))::boolean);
  select count(*) into n from public.audit_log where actor_id in (u_restricted, u_disabled) and action = 'open_link_denied';
  names := array_append(names, (format('refused link opens are audited (got %s, want 2)', n))::text); oks := array_append(oks, ((n = 2))::boolean);

  -- ------------------------------------------- admin helpers (Stage 5)
  perform set_config('request.jwt.claims', json_build_object('sub', u_restricted, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  begin execute 'set local role authenticated'; perform public.admin_merge_filters(f_fc20, f_cartoon); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot merge filters')::text); oks := array_append(oks, (ok)::boolean);
  begin execute 'set local role authenticated'; perform * from public.admin_link_open_counts(); ok := false;
  exception when insufficient_privilege then ok := true; end;
  execute 'reset role'; names := array_append(names, ('editor cannot read download counts')::text); oks := array_append(oks, (ok)::boolean);

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
  perform public.admin_set_card_filters(c3, array[f_cartoon]);
  select count(*) into n from public.card_filters where card_id = c3;
  names := array_append(names, (format('admin_set_card_filters replaces filters (got %s, want 1)', n))::text); oks := array_append(oks, (n = 1)::boolean);
  perform public.admin_merge_filters(f_fc20, f_cartoon);
  select count(*) into n from public.filters where id = f_fc20;
  names := array_append(names, ('admin_merge_filters removes the merged filter')::text); oks := array_append(oks, (n = 0)::boolean);
  select count(*) into n from public.card_filters where card_id = c2 and filter_id = f_cartoon;
  names := array_append(names, ('merged cards keep the target filter')::text); oks := array_append(oks, (n = 1)::boolean);
  perform public.admin_reorder('cards', array[c2, c1]);
  select count(*) into n from public.cards where (id = c2 and sort_order = 10) or (id = c1 and sort_order = 20);
  names := array_append(names, ('admin_reorder sets manual order')::text); oks := array_append(oks, (n = 2)::boolean);
  select coalesce(sum(opens), 0) into n from public.admin_link_open_counts() where card_id = c1;
  names := array_append(names, (format('download counts per card (got %s, want 1)', n))::text); oks := array_append(oks, (n = 1)::boolean);
  execute 'reset role';

  -- -------------------------------------------------------------- report
  for i in 1 .. cardinality(names) loop
    if oks[i] then passed := passed + 1; report := report || E'\n  PASS  ' || names[i];
    else            failed := failed + 1; report := report || E'\n  FAIL  ' || names[i];
    end if;
  end loop;
  raise exception 'RLS TEST RESULTS: % passed, % failed (all test data rolled back)%', passed, failed, report;
end
$test$;
