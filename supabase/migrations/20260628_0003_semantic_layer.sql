-- ===========================================================================
-- Semantic Layer (Phase 3) — pgvector embeddings for Matchmaking 2.0 + Companion
-- memory.
--
-- Two new owner-private vector stores, both written/read server-side (Edge
-- Functions, service role) so the OpenAI key never touches the client:
--   • profile_embeddings  — one 1536-d vector per user, summarizing their
--     profile free-text. Feeds a NEW "resonance" term in user_matches so people
--     who simply *vibe* (semantically) surface, not just keyword overlap.
--   • companion_memory    — embedded conversation turns so AI Companions can
--     recall what you've shared before (RAG), making them feel like they know you.
--
-- Fully additive + graceful: when a user has no embedding yet (or no OpenAI key
-- is configured), the semantic term contributes 0 and matchmaking behaves
-- exactly as v3. NSFW/age-layer/blocking semantics are unchanged.
--
-- Uses OpenAI text-embedding-3-small (1536 dims). This is intentionally separate
-- from the pre-existing confession_embeddings(384) table (a different embedder).
-- ===========================================================================

create extension if not exists vector;

-- ── Per-user profile vector ────────────────────────────────────────────────
create table if not exists public.profile_embeddings (
  user_id      uuid primary key references public.profiles on delete cascade,
  embedding    vector(1536) not null,
  content_hash text,
  updated_at   timestamptz not null default now()
);
-- Server-only: the matcher (SECURITY DEFINER) and the embed function read/write
-- it; clients never select it directly.
alter table public.profile_embeddings enable row level security;

create index if not exists profile_embeddings_hnsw
  on public.profile_embeddings using hnsw (embedding vector_cosine_ops);

-- ── Companion long-term memory (RAG) ───────────────────────────────────────
create table if not exists public.companion_memory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  companion_id uuid not null references public.companions on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  embedding    vector(1536) not null,
  created_at   timestamptz not null default now()
);
alter table public.companion_memory enable row level security;

create index if not exists companion_memory_owner_idx
  on public.companion_memory (user_id, companion_id, created_at);
create index if not exists companion_memory_hnsw
  on public.companion_memory using hnsw (embedding vector_cosine_ops);

-- Nearest memories for a (user, companion) given a query vector. Called only by
-- the companion-chat Edge Function (service role); locked away from clients so
-- nobody can read another user's memory by spoofing p_user.
create or replace function public.companion_recall(
  p_user uuid, p_companion uuid, p_embedding text, p_limit int default 4
)
returns table(role text, content text, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select role, content, created_at
  from public.companion_memory
  where user_id = p_user and companion_id = p_companion
  order by embedding <=> p_embedding::vector
  limit greatest(1, least(12, p_limit));
$fn$;
revoke execute on function public.companion_recall(uuid, uuid, text, int) from public, anon, authenticated;
grant execute on function public.companion_recall(uuid, uuid, text, int) to service_role;

-- ── Matchmaking v4: v3 + semantic resonance ────────────────────────────────
-- Return shape gains one trailing column (resonance); clients tolerate extra
-- columns. Semantic terms are 0 when the caller has no embedding.
drop function if exists public.user_matches(int);
create or replace function public.user_matches(p_limit int default 12)
returns table(
  user_id uuid,
  username text,
  alias text,
  shared int,
  shared_dislikes int,
  disagreements int,
  shared_interests int,
  shared_intent int,
  shared_interest_names text[],
  affinity numeric,
  resonance numeric            -- 0..1 semantic similarity (0 when no embedding)
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'interests','[]'::jsonb)  as interests,
           coalesce(profile->'lookingFor','[]'::jsonb) as intent
    from public.profiles where id = auth.uid()
  ),
  me_vec as (
    select embedding from public.profile_embeddings where user_id = auth.uid()
  ),
  mine as (
    select confession_id, reaction from public.reactions where user_id = auth.uid()
  ),
  my_total as (select greatest(count(*), 1)::numeric as c from mine),
  pair as (
    select
      r.user_id,
      count(*) filter (where m.reaction = 'feel' and r.reaction = 'feel') as agree_pos,
      count(*) filter (where m.reaction = 'wild' and r.reaction = 'wild') as agree_neg,
      count(*) filter (where m.reaction <> r.reaction)                    as disagree
    from public.reactions r
    join mine m on m.confession_id = r.confession_id
    where r.user_id <> auth.uid()
    group by r.user_id
  ),
  interest_pool as (
    select p.id as user_id
    from public.profiles p, me
    where p.id <> auth.uid()
      and coalesce(p.anonymous,false) = false
      and coalesce(p.banned,false) = false
      and public.jsonb_overlap_count(p.profile->'interests', me.interests) >= 2
    limit 300
  ),
  -- NEW: semantically nearest people (only when the caller has an embedding).
  semantic_pool as (
    select e.user_id
    from public.profile_embeddings e
    where e.user_id <> auth.uid()
      and exists (select 1 from me_vec)
    order by e.embedding <=> (select embedding from me_vec)
    limit 200
  ),
  candidates as (
    select user_id from pair
    union
    select user_id from interest_pool
    union
    select user_id from semantic_pool
  ),
  scored as (
    select
      c.user_id,
      coalesce(pr.agree_pos, 0) as agree_pos,
      coalesce(pr.agree_neg, 0) as agree_neg,
      coalesce(pr.disagree, 0)  as disagree,
      public.jsonb_overlap_count(p.profile->'interests', me.interests)  as ints,
      public.jsonb_overlap_count(p.profile->'lookingFor', me.intent)    as intent,
      public.jsonb_overlap_names(p.profile->'interests', me.interests)  as int_names,
      (case
        when exists (select 1 from me_vec) and pe.embedding is not null
          then greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec)))
        else 0
      end)::numeric as sim
    from candidates c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join pair pr on pr.user_id = c.user_id
    left join public.profile_embeddings pe on pe.user_id = c.user_id
  ),
  blended as (
    select s.*,
      (s.agree_pos * 1.0 + s.agree_neg * 0.8 - s.disagree * 0.6
        + s.ints * 1.1 + s.intent * 1.6 + s.sim * 3.0) as raw
    from scored s
  )
  select
    b.user_id,
    pr.username,
    pr.alias,
    b.agree_pos::int,
    b.agree_neg::int,
    b.disagree::int,
    b.ints::int,
    b.intent::int,
    b.int_names,
    round(least(1.0, greatest(0, b.raw) / ((select c from my_total) + 4)), 3) as affinity,
    round(b.sim, 3) as resonance
  from blended b
  join public.profiles pr on pr.id = b.user_id
  where coalesce(pr.banned, false) = false
    and coalesce(pr.anonymous, false) = false
    and (b.agree_pos > 0 or b.agree_neg > 0 or b.ints >= 2 or b.sim >= 0.55)
    and not exists (
      select 1 from public.friendships f
      where f.status = 'friends'
        and ((f.requester_id = auth.uid() and f.addressee_id = b.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = b.user_id))
    )
  order by b.raw desc, b.agree_pos desc
  limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.user_matches(int) to authenticated;
