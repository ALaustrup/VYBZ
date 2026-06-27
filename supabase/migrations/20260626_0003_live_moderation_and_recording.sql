-- Community-first moderation + opt-in recording for MYVYB Live.
--
-- Philosophy: the community drives moderation via Vyb/Fail. A thin safety net
-- handles the things community signal can't catch in time (CSAM, gore, doxing).
-- Operators see what happened; they don't watch live.

-- Streamer-chosen recording (their own clips; off by default).
alter table public.live_streams add column if not exists record boolean not null default false;
-- Auto-end reason — surfaced to the streamer + visible to operators.
alter table public.live_streams add column if not exists ended_reason text;

-- ── Live reports (one per viewer per stream) ──────────────────────────────
create table if not exists public.live_reports (
  stream_id uuid not null references public.live_streams on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  reason    text,
  created_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);
alter table public.live_reports enable row level security;
drop policy if exists "live_reports own write" on public.live_reports;
drop policy if exists "live_reports admin read" on public.live_reports;
create policy "live_reports own write" on public.live_reports
  for insert with check (user_id = auth.uid());
create policy "live_reports admin read" on public.live_reports
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin, false))
  );

-- ── Auto-end checks ────────────────────────────────────────────────────────
-- Triggered after a new reaction OR a new report; ends the stream when either
-- (a) the community Fail rate crosses the threshold with enough votes, or
-- (b) the stream collected enough independent reports within a short window.
create or replace function public.live_check_auto_end(p_stream uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v int; f int; reports_recent int; min_votes int := 8;
  fail_rate numeric; report_threshold int := 3;
begin
  select vybs, fails into v, f from public.live_streams where id = p_stream and ended_at is null;
  if v is null then return; end if;
  -- (a) Community Fail-rate auto-end.
  if (v + f) >= min_votes then
    fail_rate := f::numeric / nullif(v + f, 0);
    if fail_rate >= 0.60 then
      update public.live_streams
         set ended_at = now(), ended_reason = 'community_fail'
       where id = p_stream and ended_at is null;
      return;
    end if;
  end if;
  -- (b) Safety-net report-threshold auto-end (3+ reports in 10 minutes).
  select count(*) into reports_recent
    from public.live_reports
    where stream_id = p_stream and created_at > now() - interval '10 minutes';
  if reports_recent >= report_threshold then
    update public.live_streams
       set ended_at = now(), ended_reason = 'reports'
     where id = p_stream and ended_at is null;
    return;
  end if;
end $fn$;

create or replace function public.live_reactions_check_end() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.live_check_auto_end(NEW.stream_id);
  return NEW;
end $fn$;
drop trigger if exists trg_live_reactions_check_end on public.live_reactions;
create trigger trg_live_reactions_check_end after insert or update on public.live_reactions
for each row execute function public.live_reactions_check_end();

create or replace function public.live_reports_check_end() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.live_check_auto_end(NEW.stream_id);
  return NEW;
end $fn$;
drop trigger if exists trg_live_reports_check_end on public.live_reports;
create trigger trg_live_reports_check_end after insert on public.live_reports
for each row execute function public.live_reports_check_end();

-- ── RPCs ───────────────────────────────────────────────────────────────────

-- Extend live_start to accept the opt-in recording flag.
create or replace function public.live_start(p_title text default null, p_nsfw boolean default false, p_record boolean default false)
returns table(stream_id uuid, age_layer text, provider text)
language plpgsql security definer set search_path = public, auth as $fn$
declare
  uid uuid := auth.uid();
  my_age int; my_gender text; anon boolean; is_banned boolean; verified boolean;
  layer text; new_id uuid;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  select age, gender, coalesce(anonymous, false), coalesce(banned, false)
    into my_age, my_gender, anon, is_banned
    from public.profiles where id = uid;
  select coalesce(
    (select (email_confirmed_at is not null or confirmed_at is not null) from auth.users where id = uid),
    false
  ) into verified;
  if anon or is_banned or my_age is null or my_gender is null or not verified then
    raise exception 'not eligible to stream';
  end if;
  layer := case when my_age < 18 then 'teen' else 'adult' end;
  insert into public.live_streams(user_id, age_layer, title, nsfw, record)
    values (uid, layer, nullif(btrim(p_title), ''), coalesce(p_nsfw, false), coalesce(p_record, false))
    returning id into new_id;
  return query select new_id, layer, 'livekit'::text;
end $fn$;
grant execute on function public.live_start(text, boolean, boolean) to authenticated;

-- One-tap viewer report; one per viewer per stream.
create or replace function public.live_report(p_stream uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  insert into public.live_reports(stream_id, user_id, reason)
    values (p_stream, auth.uid(), nullif(btrim(p_reason), ''))
    on conflict (stream_id, user_id) do nothing;
end $fn$;
grant execute on function public.live_report(uuid, text) to authenticated;
