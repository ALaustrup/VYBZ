-- Operator capability expansion + a user-facing feedback channel.
--
-- 1. admin_grant_credits — issue V¢ directly to any user's wallet (recorded in
--    the existing credit_ledger so it's audit-trail clean).
-- 2. admin_user_credits — return any user's current V¢ balance (the admin user
--    search needs to surface this).
-- 3. feedback_submissions — a single channel where users can report a bug, ask
--    for help, or send any message to operators. Visible only to admins.

-- ── Grant V¢ ────────────────────────────────────────────────────────────────
create or replace function public.admin_grant_credits(p_user uuid, p_amount int, p_note text default null)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare delta int;
begin
  if not exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin, false)) then
    raise exception 'not admin';
  end if;
  -- Clamp magnitude so a fat-finger can't grant 100k V¢.
  delta := greatest(-100000, least(100000, coalesce(p_amount, 0)));
  if delta = 0 then return false; end if;
  update public.profiles set credits = greatest(0, coalesce(credits, 0) + delta) where id = p_user;
  insert into public.credit_ledger(user_id, delta, reason, ref)
    values (p_user, delta, 'admin_grant', coalesce(nullif(btrim(p_note), ''), 'admin grant'));
  insert into public.admin_actions(admin_id, action, target, detail)
    values (auth.uid(), 'grant_credits', p_user::text,
            jsonb_build_object('delta', delta, 'note', p_note));
  return true;
end $fn$;
grant execute on function public.admin_grant_credits(uuid, int, text) to authenticated;

-- Quick balance read for the user-search row (RLS already locks profiles).
create or replace function public.admin_user_credits(p_user uuid)
returns int language sql security definer set search_path = public stable as $fn$
  select coalesce(credits, 0)::int from public.profiles
   where id = p_user
     and exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin, false));
$fn$;
grant execute on function public.admin_user_credits(uuid) to authenticated;

-- Expose `credits` on the admin user-search result too (extend admin_list_users).
drop function if exists public.admin_list_users(text, int);
create or replace function public.admin_list_users(p_query text default '', p_limit int default 30)
returns table(
  id uuid, alias text, username text,
  godmode boolean, banned boolean, anonymous boolean,
  gender text, age int, credits int, created_at timestamptz
)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.alias, p.username,
         coalesce(p.godmode,false), coalesce(p.banned,false), coalesce(p.anonymous,false),
         p.gender, p.age, coalesce(p.credits, 0)::int, p.created_at
  from public.profiles p
  where exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
    and (coalesce(p_query,'') = ''
         or p.username ilike '%'||p_query||'%'
         or p.alias    ilike '%'||p_query||'%'
         or p.id::text = p_query)
  order by p.last_active_at desc nulls last
  limit greatest(1, least(200, p_limit));
$fn$;
grant execute on function public.admin_list_users(text, int) to authenticated;

-- ── Feedback channel ────────────────────────────────────────────────────────
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  category text not null check (category in ('bug', 'feature', 'help', 'other')),
  body text not null,
  contact text,                          -- optional email/handle the user lets us reach them at
  user_agent text,                       -- browser fingerprint for repro
  url text,                              -- the page they were on when they submitted
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists feedback_status_idx
  on public.feedback_submissions (status, created_at desc);

alter table public.feedback_submissions enable row level security;

-- Users can insert their own; admins read & update everything.
drop policy if exists "feedback insert own" on public.feedback_submissions;
drop policy if exists "feedback admin read" on public.feedback_submissions;
drop policy if exists "feedback admin update" on public.feedback_submissions;
create policy "feedback insert own" on public.feedback_submissions
  for insert with check (user_id = auth.uid() or auth.uid() is null);
create policy "feedback admin read" on public.feedback_submissions
  for select using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
  );
create policy "feedback admin update" on public.feedback_submissions
  for update using (
    exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
  );

create or replace function public.submit_feedback(
  p_category text, p_body text, p_contact text default null, p_url text default null, p_user_agent text default null
) returns boolean
language plpgsql security definer set search_path = public as $fn$
declare clean text; cat text;
begin
  clean := btrim(coalesce(p_body, ''));
  if char_length(clean) < 3 then return false; end if;
  cat := lower(coalesce(p_category, 'other'));
  if cat not in ('bug', 'feature', 'help', 'other') then cat := 'other'; end if;
  insert into public.feedback_submissions(user_id, category, body, contact, user_agent, url)
    values (auth.uid(), cat, left(clean, 4000),
            nullif(btrim(p_contact), ''), nullif(btrim(p_user_agent), ''), nullif(btrim(p_url), ''));
  return true;
end $fn$;
grant execute on function public.submit_feedback(text, text, text, text, text) to anon, authenticated;

create or replace function public.admin_list_feedback(p_status text default 'open', p_limit int default 50)
returns setof public.feedback_submissions
language sql security definer set search_path = public stable as $fn$
  select * from public.feedback_submissions
   where exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
     and (coalesce(p_status,'all') = 'all' or status = p_status)
   order by created_at desc
   limit greatest(1, least(200, p_limit));
$fn$;
grant execute on function public.admin_list_feedback(text, int) to authenticated;

create or replace function public.admin_resolve_feedback(p_id uuid, p_status text, p_note text default null)
returns boolean language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false)) then
    raise exception 'not admin';
  end if;
  if lower(coalesce(p_status,'')) not in ('open', 'in_progress', 'resolved') then return false; end if;
  update public.feedback_submissions
     set status = lower(p_status),
         admin_note = coalesce(nullif(btrim(p_note), ''), admin_note),
         resolved_at = case when lower(p_status) = 'resolved' then now() else null end
   where id = p_id;
  return true;
end $fn$;
grant execute on function public.admin_resolve_feedback(uuid, text, text) to authenticated;
