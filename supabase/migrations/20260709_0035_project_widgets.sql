-- ===========================================================================
-- VYBZ — Project widgets + profile showcase ("Projects", formerly Studio)
--
-- Each project becomes a dashboard: creators add WIDGETS (pluggable cards that
-- surface data from external sources) and can SHOWCASE a project on their
-- profile. Embed widgets (Spotify/YouTube/SoundCloud/Bandcamp/Apple Music/link)
-- work with just a public URL — no keys. OAuth "account" connectors (Spotify for
-- Artists, Facebook Page, TikTok analytics) are represented too but are gated on
-- provider API credentials (handled in the client + a future edge connector).
--
-- Access: widgets are edited by the project OWNER (definer RPCs re-check owner);
-- read by project members OR anyone when the project is showcased.
-- ===========================================================================

set search_path = public, extensions;

alter table public.projects add column if not exists showcase boolean not null default false;

create table if not exists public.project_widgets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  kind        text not null,               -- 'spotify' | 'youtube' | 'soundcloud' | 'bandcamp' | 'apple_music' | 'link' | 'spotify_artist' | 'facebook_page' | 'tiktok' | ...
  title       text,
  config      jsonb not null default '{}'::jsonb,   -- e.g. { "url": "https://..." }
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists project_widgets_project_idx on public.project_widgets(project_id, sort);
alter table public.project_widgets enable row level security;
-- No direct client access; all reads/writes flow through definer RPCs below.

-- ── Add a widget (owner only) ───────────────────────────────────────────────
create or replace function public.add_project_widget(p_project uuid, p_kind text, p_title text default null, p_config jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); wid uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not exists (select 1 from public.projects where id = p_project and owner_id = uid) then
    raise exception 'not your project';
  end if;
  insert into public.project_widgets (project_id, kind, title, config, sort)
  values (p_project, p_kind, nullif(trim(coalesce(p_title,'')),''), coalesce(p_config,'{}'::jsonb),
          coalesce((select max(sort)+1 from public.project_widgets where project_id = p_project), 0))
  returning id into wid;
  return wid;
end $fn$;
grant execute on function public.add_project_widget(uuid, text, text, jsonb) to authenticated;

-- ── Remove a widget (owner only) ────────────────────────────────────────────
create or replace function public.remove_project_widget(p_widget uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  delete from public.project_widgets w
   using public.projects p
   where w.id = p_widget and w.project_id = p.id and p.owner_id = uid;
end $fn$;
grant execute on function public.remove_project_widget(uuid) to authenticated;

-- ── Reorder widgets (owner only) ────────────────────────────────────────────
create or replace function public.reorder_project_widgets(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.project_widgets w set sort = idx.ord
  from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord) idx,
       public.projects p
  where w.id = idx.id and w.project_id = p.id and p.owner_id = uid;
end $fn$;
grant execute on function public.reorder_project_widgets(uuid[]) to authenticated;

-- ── Toggle profile showcase (owner only) ────────────────────────────────────
create or replace function public.set_project_showcase(p_project uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  update public.projects set showcase = coalesce(p_on, false)
   where id = p_project and owner_id = uid;
end $fn$;
grant execute on function public.set_project_showcase(uuid, boolean) to authenticated;

-- ── Extend project_detail with widgets + showcase (members) ─────────────────
create or replace function public.project_detail(p_project uuid)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select case when public.is_project_member(p_project, auth.uid()) then jsonb_build_object(
    'project', (select to_jsonb(p) from public.projects p where p.id = p_project),
    'is_owner', (select owner_id = auth.uid() from public.projects where id = p_project),
    'collaborators', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', c.user_id, 'username', pr.username, 'role', r.label, 'can_upload', c.can_upload,
        'split', s.split, 'agreed', s.agreed) order by c.created_at)
      from public.project_collaborators c
      join public.profiles pr on pr.id = c.user_id
      left join public.roles r on r.id = c.role_id
      left join public.split_sheets s on s.project_id = c.project_id and s.user_id = c.user_id
      where c.project_id = p_project), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'version', v.version, 'note', v.note, 'uploader', pr.username,
        'asset_id', v.asset_id, 'kind', a.kind, 'format', a.format, 'created_at', v.created_at) order by v.version desc)
      from public.project_versions v
      join public.profiles pr on pr.id = v.uploader_id
      left join public.assets a on a.id = v.asset_id
      where v.project_id = p_project), '[]'::jsonb),
    'widgets', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'kind', w.kind, 'title', w.title, 'config', w.config, 'sort', w.sort) order by w.sort, w.created_at)
      from public.project_widgets w where w.project_id = p_project), '[]'::jsonb)
  ) else null end;
$fn$;
grant execute on function public.project_detail(uuid) to authenticated;

-- ── Public: a creator's showcased projects (+ widgets) for their profile ────
create or replace function public.showcased_projects(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'title', p.title, 'description', p.description,
    'bpm', p.bpm, 'musicalKey', p.musical_key, 'genres', p.genres,
    'status', p.status,
    'widgets', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'kind', w.kind, 'title', w.title, 'config', w.config) order by w.sort, w.created_at)
      from public.project_widgets w where w.project_id = p.id), '[]'::jsonb)
  ) order by p.created_at desc), '[]'::jsonb)
  from public.projects p
  where p.owner_id = p_uid and p.showcase = true;
$fn$;
grant execute on function public.showcased_projects(uuid) to anon, authenticated;
