-- ===========================================================================
-- VYBZ — dynamic discipline modules (P1).
--
-- Each creator profile is a set of tabbed "discipline modules" (one per role).
-- A module carries shared core fields (columns) plus discipline-specific
-- structured data (JSONB `attrs`) whose shape is described by a per-discipline
-- field-schema registry, so new disciplines are added with DATA, not code.
--
-- Modules are the source of truth; on every mutation we rebuild the existing
-- creator_roles / creator_seeks graph from the user's active modules, so the
-- shipped matchmaking (collab_matches) keeps working unchanged — only richer.
-- Everything is additive; existing users are backfilled into modules and their
-- current creator_roles / creator_seeks are preserved.
-- ===========================================================================

set search_path = public, extensions;

-- ── Discipline field-schema registry (drives UI + match weights) ────────────
create table if not exists public.discipline_field_schemas (
  role_id text primary key references public.roles(id) on delete cascade,
  version int not null default 1,
  schema  jsonb not null
);
alter table public.discipline_field_schemas enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='discipline_field_schemas' and policyname='schemas read') then
    create policy "schemas read" on public.discipline_field_schemas for select using (true);
  end if;
end $$;
grant select on public.discipline_field_schemas to anon, authenticated;

-- ── Profile modules (the tabs) ──────────────────────────────────────────────
create table if not exists public.profile_modules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role_id       text not null references public.roles(id),
  category      text references public.categories(id),
  headline      text,
  years_exp     numeric,
  collab_style  text,
  availability  text,
  seeking       text[] not null default '{}',
  skill         smallint check (skill between 1 and 5),
  attrs         jsonb not null default '{}'::jsonb,
  portfolio     jsonb not null default '[]'::jsonb,
  sort          int not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists profile_modules_active_uq
  on public.profile_modules(user_id, role_id) where archived_at is null;
create index if not exists profile_modules_user_idx on public.profile_modules(user_id);
alter table public.profile_modules enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_modules' and policyname='modules read') then
    create policy "modules read" on public.profile_modules for select
      using (archived_at is null or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_modules' and policyname='modules write own') then
    create policy "modules write own" on public.profile_modules for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
grant select, insert, update, delete on public.profile_modules to authenticated;

-- ── Rebuild the matchmaking graph from a user's active modules ──────────────
create or replace function public.sync_creator_graph(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.creator_roles where user_id = p_uid;
  insert into public.creator_roles (user_id, role_id, skill)
    select p_uid, role_id, coalesce(skill, 3)::smallint
    from public.profile_modules
    where user_id = p_uid and archived_at is null
    on conflict (user_id, role_id) do update set skill = excluded.skill;

  delete from public.creator_seeks where user_id = p_uid;
  insert into public.creator_seeks (user_id, role_id, priority)
    select distinct p_uid, w.role_id, 1
    from public.profile_modules m
      cross join lateral jsonb_array_elements_text(coalesce(m.attrs->'wants_roles','[]'::jsonb)) as w(role_id)
    where m.user_id = p_uid and m.archived_at is null
      and exists (select 1 from public.roles r where r.id = w.role_id)
    on conflict (user_id, role_id) do nothing;
end $fn$;

-- ── Create / update a module (also syncs the matchmaking graph) ─────────────
create or replace function public.upsert_module(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v_id uuid := nullif(p->>'id','')::uuid;
  v_role text := p->>'roleId';
  v_cat text;
  v_seeking text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'seeking','[]'::jsonb)) x), '{}'::text[]);
begin
  if uid is null then raise exception 'auth required'; end if;
  if v_role is null or not exists (select 1 from public.roles where id = v_role) then
    raise exception 'invalid discipline';
  end if;
  select category into v_cat from public.roles where id = v_role;

  if v_id is null then
    select id into v_id from public.profile_modules
      where user_id = uid and role_id = v_role and archived_at is null;
  end if;

  if v_id is null then
    insert into public.profile_modules
      (user_id, role_id, category, headline, years_exp, collab_style, availability, seeking, skill, attrs, portfolio, sort)
    values (uid, v_role, v_cat, p->>'headline', nullif(p->>'yearsExp','')::numeric,
      p->>'collabStyle', p->>'availability', v_seeking, nullif(p->>'skill','')::smallint,
      coalesce(p->'attrs','{}'::jsonb), coalesce(p->'portfolio','[]'::jsonb),
      coalesce((select max(sort) + 1 from public.profile_modules where user_id = uid and archived_at is null), 0))
    returning id into v_id;
  else
    update public.profile_modules set
      headline = p->>'headline',
      years_exp = nullif(p->>'yearsExp','')::numeric,
      collab_style = p->>'collabStyle',
      availability = p->>'availability',
      seeking = v_seeking,
      skill = nullif(p->>'skill','')::smallint,
      attrs = coalesce(p->'attrs','{}'::jsonb),
      portfolio = coalesce(p->'portfolio','[]'::jsonb),
      archived_at = null,
      updated_at = now()
    where id = v_id and user_id = uid;
  end if;

  perform public.sync_creator_graph(uid);
  return v_id;
end $fn$;
grant execute on function public.upsert_module(jsonb) to authenticated;

-- ── Archive / restore / reorder ─────────────────────────────────────────────
create or replace function public.archive_module(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.profile_modules set archived_at = now(), updated_at = now()
    where id = p_id and user_id = uid and archived_at is null;
  perform public.sync_creator_graph(uid);
end $fn$;
grant execute on function public.archive_module(uuid) to authenticated;

create or replace function public.restore_module(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  -- Only restore if the discipline isn't already active again.
  update public.profile_modules m set archived_at = null, updated_at = now()
    where m.id = p_id and m.user_id = uid and m.archived_at is not null
      and not exists (select 1 from public.profile_modules a
        where a.user_id = uid and a.role_id = m.role_id and a.archived_at is null);
  perform public.sync_creator_graph(uid);
end $fn$;
grant execute on function public.restore_module(uuid) to authenticated;

create or replace function public.reorder_modules(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.profile_modules m set sort = idx.ord, updated_at = now()
  from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord) idx
  where m.id = idx.id and m.user_id = uid;
end $fn$;
grant execute on function public.reorder_modules(uuid[]) to authenticated;

-- ── Reads: my modules, the discipline catalog, a discipline's field schema ──
create or replace function public.my_modules()
returns jsonb language sql security definer set search_path = public stable as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'roleId', m.role_id, 'category', m.category, 'label', r.label,
    'headline', m.headline, 'yearsExp', m.years_exp, 'collabStyle', m.collab_style,
    'availability', m.availability, 'seeking', to_jsonb(m.seeking), 'skill', m.skill,
    'attrs', m.attrs, 'portfolio', m.portfolio, 'sort', m.sort
  ) order by m.sort), '[]'::jsonb)
  from public.profile_modules m join public.roles r on r.id = m.role_id
  where m.user_id = auth.uid() and m.archived_at is null;
$fn$;
grant execute on function public.my_modules() to authenticated;

create or replace function public.list_disciplines()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'label', c.label, 'icon', c.icon, 'sort', c.sort,
    'disciplines', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'label', r.label, 'family', r.family,
        'hasSchema', exists (select 1 from public.discipline_field_schemas s where s.role_id = r.id)
      ) order by r.sort), '[]'::jsonb) from public.roles r where r.category = c.id)
  ) order by c.sort), '[]'::jsonb) from public.categories c;
$fn$;
grant execute on function public.list_disciplines() to anon, authenticated;

create or replace function public.discipline_schema(p_role text)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select schema from public.discipline_field_schemas where role_id = p_role;
$fn$;
grant execute on function public.discipline_schema(text) to anon, authenticated;

-- ── Seed field schemas for the hero disciplines ─────────────────────────────
insert into public.discipline_field_schemas (role_id, schema) values
  ('producer', '{"fields":[
     {"key":"genres","label":"Genres","type":"multiselect","options":"genres","matchWeight":1.4},
     {"key":"daws","label":"DAWs","type":"proficiency_list","options":"daws","matchWeight":1.2},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:music","matchWeight":3.0}
   ]}'::jsonb),
  ('composer_score', '{"fields":[
     {"key":"genres","label":"Scoring styles","type":"multiselect","options":["Orchestral","Electronic","Hybrid","Ambient","Jazz","Rock","Choral"],"matchWeight":1.2},
     {"key":"tools","label":"Tools","type":"proficiency_list","options":["Logic Pro","Cubase","Pro Tools","Ableton","Dorico","Sibelius"],"matchWeight":0.9},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:film_video","matchWeight":2.0}
   ]}'::jsonb),
  ('director', '{"fields":[
     {"key":"formats","label":"Formats","type":"multiselect","options":["Short film","Feature","Music video","Commercial","Documentary","Series"],"matchWeight":1.3},
     {"key":"genres","label":"Genres","type":"multiselect","options":["Drama","Comedy","Horror","Sci-fi","Action","Documentary","Experimental"],"matchWeight":1.0},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:film_video","matchWeight":3.0}
   ]}'::jsonb),
  ('video_editor', '{"fields":[
     {"key":"software","label":"Software","type":"proficiency_list","options":["Premiere Pro","DaVinci Resolve","Final Cut Pro","After Effects","Avid"],"matchWeight":1.3},
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Narrative","Music video","Trailer","Social / Shorts","Color","Motion graphics"],"matchWeight":1.2},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:film_video","matchWeight":2.5}
   ]}'::jsonb),
  ('illustrator', '{"fields":[
     {"key":"styles","label":"Styles","type":"multiselect","options":["Realism","Anime / Manga","Cartoon","Vector","Painterly","Line art","Pixel"],"matchWeight":1.4},
     {"key":"software","label":"Software","type":"proficiency_list","options":["Procreate","Photoshop","Clip Studio","Illustrator","Krita"],"matchWeight":1.1},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:visual_art","matchWeight":2.5}
   ]}'::jsonb),
  ('3d_modeler', '{"fields":[
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Hard surface","Organic","Characters","Environments","Props"],"matchWeight":1.5},
     {"key":"software","label":"Software","type":"proficiency_list","options":["Blender","Maya","ZBrush","3ds Max","Cinema 4D","Substance"],"matchWeight":1.3},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:visual_art","matchWeight":2.5}
   ]}'::jsonb),
  ('graphic_designer', '{"fields":[
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Branding","Typography","Layout","Packaging","Motion","Web"],"matchWeight":1.4},
     {"key":"software","label":"Software","type":"proficiency_list","options":["Illustrator","Photoshop","InDesign","Figma","After Effects"],"matchWeight":1.1},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:visual_art","matchWeight":2.0}
   ]}'::jsonb),
  ('photographer', '{"fields":[
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Portrait","Product","Editorial","Event","Landscape","Street","Fashion"],"matchWeight":1.4},
     {"key":"gear","label":"System","type":"multiselect","options":["Canon","Sony","Nikon","Fujifilm","Medium format"],"matchWeight":0.6},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:visual_art","matchWeight":1.8}
   ]}'::jsonb),
  ('game_designer', '{"fields":[
     {"key":"genres","label":"Preferred genres","type":"multiselect","options":["Action","RPG","Strategy","Puzzle","Roguelike","Simulation","Platformer","Shooter","Narrative","Horror","Sandbox"],"matchWeight":1.4},
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Systems","Narrative","Level design","Economy","Combat","Progression","UX"],"matchWeight":1.6},
     {"key":"engines","label":"Engines","type":"proficiency_list","options":["Unity","Unreal","Godot","GameMaker","Custom"],"matchWeight":1.2},
     {"key":"team_scope","label":"Team size you enjoy","type":"select","options":["Solo","2–5","6–15","16+"],"matchWeight":0.5},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:game_dev","matchWeight":3.0}
   ]}'::jsonb),
  ('narrative_designer', '{"fields":[
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Branching","Worldbuilding","Dialogue","Quest design","Lore"],"matchWeight":1.5},
     {"key":"tools","label":"Tools","type":"multiselect","options":["Twine","Ink","Yarn","articy:draft","Notion"],"matchWeight":0.8},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:game_dev","matchWeight":3.0}
   ]}'::jsonb),
  ('game_programmer', '{"fields":[
     {"key":"languages","label":"Languages","type":"multiselect","options":["C#","C++","Rust","GDScript","Lua","TypeScript"],"matchWeight":1.2},
     {"key":"engines","label":"Engines","type":"proficiency_list","options":["Unity","Unreal","Godot","Bevy","Custom"],"matchWeight":1.3},
     {"key":"specializations","label":"Specializations","type":"multiselect","options":["Gameplay","Graphics","Netcode","Tools","AI","Physics"],"matchWeight":1.4},
     {"key":"wants_roles","label":"Want to collaborate with","type":"role_multiselect","options":"roles:game_dev","matchWeight":2.5}
   ]}'::jsonb)
on conflict (role_id) do update set schema = excluded.schema, version = public.discipline_field_schemas.version + 1;

-- ── Backfill existing users into modules (preserves their matchmaking graph) ─
insert into public.profile_modules (user_id, role_id, category, skill, attrs, sort)
select cr.user_id, cr.role_id, r.category, cr.skill,
  jsonb_build_object('wants_roles',
    coalesce((select jsonb_agg(cs.role_id) from public.creator_seeks cs where cs.user_id = cr.user_id), '[]'::jsonb)),
  (row_number() over (partition by cr.user_id order by r.sort)) - 1
from public.creator_roles cr join public.roles r on r.id = cr.role_id
on conflict (user_id, role_id) where archived_at is null do nothing;
