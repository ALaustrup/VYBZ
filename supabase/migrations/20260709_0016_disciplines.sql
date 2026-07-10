-- ===========================================================================
-- VYBZ — multi-discipline foundation (P0): the CATEGORY axis.
--
-- Generalises the platform from music-only to all creative disciplines while
-- keeping everything additive. The existing `roles` catalog becomes the
-- canonical "disciplines" catalog; we add a `category` (top-level vertical)
-- above the existing intra-vertical `family` grouping, backfill all current
-- roles to 'music', and seed adjacency-first verticals (Film/Video, Visual
-- Arts, Game Dev) with their own disciplines. creator_roles / creator_seeks /
-- role_affinities all continue to work unchanged — new roles are immediately
-- usable by matchmaking.
-- ===========================================================================

set search_path = public, extensions;

-- ── Category (top-level vertical) ────────────────────────────────────────────
create table if not exists public.categories (
  id    text primary key,
  label text not null,
  icon  text,                        -- lucide icon name (client maps)
  sort  int not null default 0
);
alter table public.categories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories read') then
    create policy "categories read" on public.categories for select using (true);
  end if;
end $$;
grant select on public.categories to anon, authenticated;

-- Adjacency-first: Music (existing) → Film/Video → Visual Arts → Game Dev.
insert into public.categories (id, label, icon, sort) values
  ('music','Music & Sound','music',10),
  ('film_video','Film & Video','clapperboard',20),
  ('visual_art','Visual Arts','palette',30),
  ('game_dev','Game Development','gamepad-2',40)
on conflict (id) do update set label = excluded.label, icon = excluded.icon, sort = excluded.sort;

-- ── Scope the disciplines catalog by category ───────────────────────────────
alter table public.roles add column if not exists category text references public.categories(id);
update public.roles set category = 'music' where category is null;
create index if not exists roles_category_idx on public.roles(category);

-- ── New disciplines for the adjacency-first verticals ───────────────────────
insert into public.roles (id, label, family, category, sort) values
  -- Film & Video
  ('director','Director','direction','film_video',10),
  ('screenwriter_film','Screenwriter','writing','film_video',20),
  ('producer_film','Producer','production','film_video',30),
  ('cinematographer','Cinematographer','camera','film_video',40),
  ('gaffer','Gaffer / Lighting','camera','film_video',50),
  ('video_editor','Video Editor','post','film_video',60),
  ('colorist','Colorist','post','film_video',70),
  ('vfx_artist','VFX Artist','post','film_video',80),
  ('motion_designer','Motion Designer','post','film_video',90),
  ('composer_score','Score Composer','audio','film_video',100),
  ('sound_designer_film','Sound Designer','audio','film_video',110),
  ('sound_mixer_film','Re-recording Mixer','audio','film_video',120),
  -- Visual Arts
  ('illustrator','Illustrator','illustration','visual_art',10),
  ('concept_artist','Concept Artist','illustration','visual_art',20),
  ('digital_painter','Digital Painter','illustration','visual_art',30),
  ('character_artist','Character Artist','illustration','visual_art',40),
  ('3d_modeler','3D Modeler','three_d','visual_art',50),
  ('animator_2d','2D Animator','animation','visual_art',60),
  ('animator_3d','3D Animator','animation','visual_art',70),
  ('graphic_designer','Graphic Designer','design','visual_art',80),
  ('photographer','Photographer','photography','visual_art',90),
  ('photo_editor','Photo Editor / Retoucher','photography','visual_art',100),
  -- Game Development
  ('game_designer','Game Designer','design','game_dev',10),
  ('narrative_designer','Narrative Designer','design','game_dev',20),
  ('level_designer','Level Designer','design','game_dev',30),
  ('systems_designer','Systems Designer','design','game_dev',40),
  ('game_programmer','Game Programmer','code','game_dev',50),
  ('technical_artist','Technical Artist','code','game_dev',60),
  ('game_artist','Game Artist','art','game_dev',70),
  ('ui_ux_designer_game','UI/UX Designer','design','game_dev',80),
  ('game_audio_designer','Game Audio Designer','audio','game_dev',90),
  ('producer_game','Game Producer','production','game_dev',100)
on conflict (id) do update set label = excluded.label, family = excluded.family,
  category = excluded.category, sort = excluded.sort;
