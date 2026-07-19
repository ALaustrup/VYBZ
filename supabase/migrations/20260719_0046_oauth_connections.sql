-- ===========================================================================
-- VYBZ — Phase C3: OAuth connector connections (Spotify / FB / TikTok)
-- Tokens are service-role only; clients read metadata via list_my_oauth.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('spotify_artist', 'facebook_page', 'tiktok')),
  external_id text,
  access_token text,
  refresh_token text,
  scopes text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists oauth_connections_user_idx on public.oauth_connections (user_id);

alter table public.oauth_connections enable row level security;
-- No direct client policies — tokens never leave via PostgREST.

create or replace function public.list_my_oauth()
returns table(
  id uuid, provider text, external_id text, meta jsonb,
  expires_at timestamptz, connected_at timestamptz
)
language sql security definer set search_path = public stable as $fn$
  select c.id, c.provider, c.external_id, c.meta, c.expires_at, c.created_at
  from public.oauth_connections c
  where c.user_id = auth.uid();
$fn$;

create or replace function public.disconnect_oauth(p_provider text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  delete from public.oauth_connections
  where user_id = auth.uid() and provider = p_provider;
end;
$fn$;

create or replace function public.oauth_providers_status()
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  spotify_ready boolean := false;
begin
  -- Client uses VITE_FEATURE_OAUTH_SPOTIFY; this RPC reports live DB connections only.
  -- Edge secrets presence is not queryable from SQL — return connected flags.
  return jsonb_build_object(
    'spotify_artist', exists (
      select 1 from public.oauth_connections
      where user_id = auth.uid() and provider = 'spotify_artist'
    ),
    'facebook_page', exists (
      select 1 from public.oauth_connections
      where user_id = auth.uid() and provider = 'facebook_page'
    ),
    'tiktok', exists (
      select 1 from public.oauth_connections
      where user_id = auth.uid() and provider = 'tiktok'
    )
  );
end;
$fn$;

grant execute on function public.list_my_oauth() to authenticated;
grant execute on function public.disconnect_oauth(text) to authenticated;
grant execute on function public.oauth_providers_status() to authenticated;
