-- TikTok OAuth token store for the Content Posting API integration.
-- RLS is enabled with NO policies on purpose: only the service-role key
-- (used by the serverless functions in /api/tiktok) can read or write here.
-- Never expose this table to the anon/client key.

create table if not exists public.tiktok_accounts (
  open_id                   text primary key,
  username                  text,
  scope                     text,
  access_token              text not null,
  refresh_token             text not null,
  access_token_expires_at   timestamptz,
  refresh_token_expires_at  timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.tiktok_accounts enable row level security;
