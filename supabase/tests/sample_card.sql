-- One test card, so you can see how a real card looks in the library.
-- Paste into Supabase Dashboard -> SQL Editor and click Run. Safe to run
-- more than once (it replaces the previous test card).
--
--   Preview:   Big Buck Bunny (Blender Foundation, open movie) on YouTube
--   Filters:   FC 27, Cartoon, Premiere Pro
--   Links:     two Mega placeholders (they open mega.nz, not real files)
--   Loom:      none, so the Tutorial button shows as unavailable
--
-- To remove it later, run only the line at the very bottom.

begin;

delete from public.cards where slug = 'test-glitch-transition';

with card as (
  insert into public.cards (section_id, slug, title, description, youtube_id, preview_start, preview_end, status)
  select s.id,
         'test-glitch-transition',
         'TEST · Glitch transition',
         'Sample card for checking the layout. A quick RGB-split glitch between two clips. Delete it before launch.',
         'aqz-KE-bpKQ',
         60,
         66,
         'published'
  from public.sections s
  where s.slug = 'effects'
  returning id
),
tags as (
  insert into public.card_filters (card_id, filter_id)
  select card.id, f.id
  from card, public.filters f
  where f.slug in ('fc-27', 'cartoon', 'premiere-pro')
  returning card_id
)
insert into public.card_links (card_id, kind, label, url, sort_order)
select card.id, v.kind::public.link_kind, v.label, v.url, v.sort_order
from card, (values
  ('project',  'Premiere Pro project', 'https://mega.nz/', 0),
  ('download', 'Transparent .mov',     'https://mega.nz/', 0)
) as v (kind, label, url, sort_order);

commit;

select title, status, has_project_files, has_downloads, filter_text
from public.cards
where slug = 'test-glitch-transition';

-- Remove the test card:
-- delete from public.cards where slug = 'test-glitch-transition';
