-- Starting sections and filters (Phase 0 answers Q7, Q13). No cards, no users.
-- Safe to run more than once.

insert into public.sections (slug, name, kind, sort_order) values
  ('effects',       'Effects',           'effect', 10),
  ('music',         'Music',             'music',  20),
  ('sound-effects', 'Sound effects',     'sound',  30),
  ('fonts',         'Fonts',             'font',   40),
  ('text-graphics', 'Text & graphics',   'text',   50)
on conflict (slug) do nothing;

insert into public.filter_groups (slug, name, sort_order) values
  ('game',     'Game',           10),
  ('style',    'Style',          20),
  ('client',   'Client/channel', 30),
  ('software', 'Software',       40),
  ('mood',     'Music mood',     50)
on conflict (slug) do nothing;

insert into public.filters (group_id, slug, name, is_quick, sort_order)
select g.id, v.slug, v.name, v.is_quick, v.sort_order
from (values
  ('game',     'fc-27',             'FC 27',         true,  10),
  ('game',     'fc-20',             'FC 20',         true,  20),
  ('style',    'cartoon',           'Cartoon',       true,  10),
  ('style',    'documentary',       'Documentary',   true,  20),
  ('style',    'sports',            'Sports',        true,  30),
  ('client',   'ped',               'PED',           true,  10),
  ('software', 'premiere-pro',      'Premiere Pro',  true,  10),
  ('software', 'after-effects',     'After Effects', true,  20),
  ('mood',     'sad',               'Sad',           false, 10),
  ('mood',     'documentary-music', 'Documentary',   false, 20),
  ('mood',     'funny-drop',        'Funny drop',    false, 30),
  ('mood',     'happy',             'Happy',         false, 40)
) as v (group_slug, slug, name, is_quick, sort_order)
join public.filter_groups g on g.slug = v.group_slug
on conflict (slug) do nothing;
