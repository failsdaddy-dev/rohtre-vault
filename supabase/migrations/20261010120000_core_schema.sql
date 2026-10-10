-- RohTre VideoHub: core schema (tables, types, indexes).
-- Access rules live in 20261010120100_access_rules.sql.

create extension if not exists pg_trgm with schema extensions;

-- Helpers that RLS calls run as SECURITY DEFINER, so they live outside the
-- exposed API schemas. verified: https://supabase.com/docs/guides/database/postgres/row-level-security
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.user_role    as enum ('admin', 'editor');
create type public.card_status  as enum ('draft', 'published');
create type public.section_kind as enum ('effect', 'music', 'sound', 'font', 'text');
create type public.link_kind    as enum ('project', 'download');

-- ---------------------------------------------------------------- profiles
-- One row per login. Created by trigger when the admin creates an auth user.
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text not null,
  display_name         text not null default '',
  role                 public.user_role not null default 'editor',
  is_active            boolean not null default true,
  all_access           boolean not null default false,   -- senior editors: see every card
  expires_at           timestamptz,                      -- optional auto-disable date
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------- sections
create table public.sections (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (length(name) between 1 and 60),
  kind       public.section_kind not null,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- filters
create table public.filter_groups (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Filter slugs are globally unique so URLs stay short: ?f=cartoon,fc-27
create table public.filters (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.filter_groups (id) on delete restrict,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (length(name) between 1 and 80),
  is_quick   boolean not null default false,  -- shown in the chip row
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index filters_group_order_idx on public.filters (group_id, sort_order, name);
create index filters_name_trgm_idx   on public.filters using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------- cards
create table public.cards (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references public.sections (id) on delete restrict,
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null check (length(title) between 1 and 200),
  description       text not null default '' check (length(description) <= 5000),
  youtube_id        text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  preview_start     int not null default 0 check (preview_start >= 0),
  preview_end       int check (preview_end is null or preview_end > preview_start),
  loom_url          text check (loom_url ~ '^https://(www\.)?loom\.com/'),
  source_url        text check (source_url ~ '^https://'),  -- music: "Open on platform"
  status            public.card_status not null default 'draft',
  sort_order        int not null default 0,                   -- admin's manual order
  -- Set by triggers from card_links so the UI can grey out buttons
  -- without ever receiving the links themselves.
  has_project_files boolean not null default false,
  has_downloads     boolean not null default false,
  filter_text       text not null default '',                 -- filter names, kept by trigger, for search
  search_tsv        tsvector generated always as (
                      setweight(to_tsvector('simple'::regconfig, title), 'A') ||
                      setweight(to_tsvector('simple'::regconfig, filter_text), 'B') ||
                      setweight(to_tsvector('simple'::regconfig, description), 'C')
                    ) stored,
  published_at      timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (section_id, slug)
);
create index cards_newest_idx on public.cards (section_id, status, published_at desc, id desc);
create index cards_manual_idx on public.cards (section_id, status, sort_order, id);
create index cards_search_idx on public.cards using gin (search_tsv);
create index cards_title_trgm_idx on public.cards using gin (title extensions.gin_trgm_ops);

create table public.card_filters (
  card_id   uuid not null references public.cards (id) on delete cascade,
  filter_id uuid not null references public.filters (id) on delete cascade,
  primary key (card_id, filter_id)
);
create index card_filters_filter_idx on public.card_filters (filter_id, card_id);

-- Mega links. The url column is never granted to browser roles; see access rules.
create table public.card_links (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.cards (id) on delete cascade,
  kind       public.link_kind not null,
  label      text not null check (length(label) between 1 and 60),  -- "Premiere Pro", "Transparent .mov"
  url        text not null check (url ~ '^https://'),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index card_links_card_idx on public.card_links (card_id, kind, sort_order);

-- ---------------------------------------------------------------- access
-- Restricted editors see a card when it carries at least one of these filters.
create table public.user_filter_access (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  filter_id uuid not null references public.filters (id) on delete cascade,
  primary key (user_id, filter_id)
);
create index user_filter_access_filter_idx on public.user_filter_access (filter_id);

-- ---------------------------------------------------------------- audit
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,       -- login | open_link | open_link_denied | admin_*
  card_id     uuid references public.cards (id) on delete set null,
  link_id     uuid references public.card_links (id) on delete set null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_card_idx    on public.audit_log (card_id, action);
create index audit_log_actor_idx   on public.audit_log (actor_id, created_at desc);
