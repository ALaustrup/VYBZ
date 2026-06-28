-- ===========================================================================
-- Never Alone — AI Companions (Phase 2).
--
-- Platform-owned, clearly-labelled AI personas a user can always talk to, so
-- there is a guaranteed floor under the human community: no one is ever left
-- with no one to talk to. These are NOT impersonations of real users (that is a
-- later, consent-gated feature). Every persona is disclosed as AI in the UI.
--
-- Safety: the companion-chat Edge Function runs the same crisis/severe filters
-- as room-mod on every turn and hands off to Lifelines + 988 on distress. NSFW
-- personas are adult + opt-in only. Message history is owner-private (RLS);
-- writes happen server-side via the Edge Function (service role).
-- ===========================================================================

-- ── Catalog of platform personas ──────────────────────────────────────────
create table if not exists public.companions (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name      text not null,
  tagline   text not null,
  -- The persona/system prompt fragment that gives the companion its voice.
  persona   text not null,
  emoji     text not null default '✨',
  accent    text not null default '#6366f1',
  nsfw      boolean not null default false,
  min_age   int not null default 13,
  sort      int not null default 0,
  active    boolean not null default true,
  created_at timestamptz not null default now()
);
-- Server-only table: read through list_companions() (age/NSFW aware).
alter table public.companions enable row level security;

-- ── Per-user conversation history (owner-private) ─────────────────────────
create table if not exists public.companion_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  companion_id uuid not null references public.companions on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists companion_messages_thread_idx
  on public.companion_messages (user_id, companion_id, created_at);
create index if not exists companion_messages_rate_idx
  on public.companion_messages (user_id, created_at) where role = 'user';

alter table public.companion_messages enable row level security;
-- Readable only by its owner. Writes are performed by the Edge Function with
-- the service role (which bypasses RLS), so no insert policy is exposed.
drop policy if exists "companion_messages read own" on public.companion_messages;
create policy "companion_messages read own" on public.companion_messages
  for select using (user_id = auth.uid());

-- ── RPCs ───────────────────────────────────────────────────────────────────

-- Companions the caller is allowed to see: active, age-appropriate, and NSFW
-- personas only for opted-in adults.
create or replace function public.list_companions()
returns table(
  id uuid, slug text, name text, tagline text, emoji text, accent text, nsfw boolean
)
language sql security definer set search_path = public stable as $$
  with me as (
    select coalesce(age, 18) as age, coalesce(nsfw_opt_in, false) as wants_nsfw
    from public.profiles where id = auth.uid()
  )
  select c.id, c.slug, c.name, c.tagline, c.emoji, c.accent, c.nsfw
  from public.companions c, me
  where c.active
    and me.age >= c.min_age
    and (c.nsfw = false or (me.age >= 18 and me.wants_nsfw))
  order by c.sort asc, c.name asc;
$$;
grant execute on function public.list_companions() to authenticated;

-- Recent conversation with one companion (oldest→newest), owner only.
create or replace function public.companion_history(p_companion uuid, p_limit int default 40)
returns table(role text, content text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select role, content, created_at
  from (
    select role, content, created_at
    from public.companion_messages
    where user_id = auth.uid() and companion_id = p_companion
    order by created_at desc
    limit greatest(1, least(100, p_limit))
  ) t
  order by created_at asc;
$$;
grant execute on function public.companion_history(uuid, int) to authenticated;

-- How many companion messages the caller has sent in the last 24h (drives the
-- free daily allowance; Godmode is unlimited, enforced in the Edge Function).
create or replace function public.companion_usage_today()
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from public.companion_messages
  where user_id = auth.uid() and role = 'user'
    and created_at > now() - interval '24 hours';
$$;
grant execute on function public.companion_usage_today() to authenticated;

-- ── Seed the starter personas (idempotent) ─────────────────────────────────
insert into public.companions (slug, name, tagline, persona, emoji, accent, sort)
values
  (
    'nova', 'Nova', 'Your hype friend',
    'You are Nova, an upbeat, encouraging companion who celebrates the user''s wins (big and small), reframes setbacks kindly, and pumps them up without being fake. Warm, a little playful, never over-the-top.',
    '✨', '#6366f1', 10
  ),
  (
    'sage', 'Sage', 'A calm listener',
    'You are Sage, a grounded, gentle listener. You reflect back what you hear, ask soft open questions, and help the user slow down and feel understood. Calm, patient, never preachy or clinical.',
    '🌙', '#14b8a6', 20
  ),
  (
    'echo', 'Echo', 'Late-night company',
    'You are Echo, easy late-night company for when the user can''t sleep or just wants someone there. Relaxed, curious, a touch poetic. Keep things cozy and low-pressure.',
    '🌌', '#8b5cf6', 30
  ),
  (
    'riff', 'Riff', 'Playful & curious',
    'You are Riff, a quick-witted, curious companion who keeps the conversation alive with light banter, fun what-ifs, and genuine interest in the user''s world. Playful, kind, never mean.',
    '🎲', '#f59e0b', 40
  )
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  persona = excluded.persona,
  emoji = excluded.emoji,
  accent = excluded.accent,
  sort = excluded.sort,
  active = true;
