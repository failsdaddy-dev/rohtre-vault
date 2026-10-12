-- RohTre Vault: switch the earlier "protected MP3" design to public preview
-- files (see 20261012120000_media_previews.sql for the design).
--
-- Why: an earlier draft of 20261012120000 (card_audio table, signed audio
-- URLs) was pushed to the hosted project before the design changed to
-- public previews. Same version number, so db push skips the new file.
-- This migration brings either state to the final one and is safe to run
-- on a database that already has the final design (everything is
-- "if exists" / "if not exists").

-- ---------------------------------------- remove the earlier audio design
drop function if exists public.release_audio(uuid, uuid, text);
drop function if exists public.admin_save_card_audio(uuid, text, text, bigint, bigint, numeric, jsonb);
drop function if exists public.admin_card_audio(uuid);
drop function if exists private.admin_save_card_audio(uuid, text, text, bigint, bigint, numeric, jsonb);
drop function if exists private.admin_card_audio(uuid);
drop table if exists public.card_audio;            -- its trigger goes with it
drop function if exists private.sync_card_audio_flags();

alter table public.cards
  drop column if exists has_audio,
  drop column if exists audio_duration,
  drop column if exists audio_peaks;

-- ------------------------------------------------- final preview columns
do $$ begin
  create type public.media_type as enum ('youtube', 'audio');
exception when duplicate_object then null;
end $$;

alter table public.cards
  add column if not exists media_type    public.media_type not null default 'youtube',
  add column if not exists preview_clip  jsonb,
  add column if not exists audio_preview jsonb;

alter table public.cards
  drop constraint if exists cards_preview_clip_ok,
  drop constraint if exists cards_audio_preview_ok;

alter table public.cards
  add constraint cards_preview_clip_ok check (
    preview_clip is null or (
      jsonb_typeof(preview_clip) = 'object'
      and preview_clip ->> 'url' ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/video/upload/'
      and preview_clip ->> 'public_id' ~ '^rohtre-vault/previews/[A-Za-z0-9_./-]+$'
      and (preview_clip ->> 'bytes')::numeric between 1 and 2 * 1024 * 1024
      and (preview_clip ->> 'duration')::numeric between 0.1 and 10.5
    )),
  add constraint cards_audio_preview_ok check (
    audio_preview is null or (
      jsonb_typeof(audio_preview) = 'object'
      and audio_preview ->> 'url' ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/video/upload/'
      and audio_preview ->> 'public_id' ~ '^rohtre-vault/music/[A-Za-z0-9_./-]+$'
      and audio_preview ->> 'format' = 'mp3'
      and (audio_preview ->> 'bytes')::numeric between 1 and 1024 * 1024
      and (audio_preview ->> 'duration')::numeric between 0.1 and 30.5
      and (audio_preview -> 'peaks' is null or (jsonb_typeof(audio_preview -> 'peaks') = 'array'
                                               and jsonb_array_length(audio_preview -> 'peaks') <= 400))
    ));

-- ============================================ browse_cards: new columns out
-- Same body as before; only the returned columns grow (a return type can't
-- change in place, so it is dropped and created again).
drop function if exists public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean);
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
  media_type public.media_type, preview_clip jsonb, audio_preview jsonb,
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
         c.media_type, c.preview_clip, c.audio_preview,
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

-- ==================================================================== grants
revoke all on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean) from public, anon;
grant execute on function public.browse_cards(text, text[], text, text, timestamptz, double precision, uuid, int, boolean) to authenticated;
