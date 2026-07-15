-- ===========================================================================
-- VYBZ — Staff system: role tiers (member < moderator < admin), moderator
-- applications, a content-report → moderation queue, a rewards ledger (mod
-- points = cosmetic-store credits), and a staff audit log.
--
-- Security model: every privileged path is a SECURITY DEFINER RPC that re-checks
-- is_platform_admin() or is_platform_mod() against auth.uid(). Moderators can
-- triage/act on content but CANNOT appoint staff, ban permanently, or read the
-- member roster — those stay admin-only. Privilege can never self-escalate.
-- ===========================================================================

set search_path = public, extensions;

-- ── Role tier + rewards balance ─────────────────────────────────────────────
alter table public.profiles add column if not exists platform_role text not null default 'member';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_platform_role_chk') then
    alter table public.profiles add constraint profiles_platform_role_chk
      check (platform_role in ('member','moderator','admin'));
  end if;
end $$;
alter table public.profiles add column if not exists mod_points integer not null default 0;
-- Backfill from the legacy boolean so existing admins keep access.
update public.profiles set platform_role = 'admin' where is_admin = true and platform_role <> 'admin';

-- Admin guard now honours platform_role (keeps is_admin as a synced fallback).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select platform_role = 'admin' or is_admin from public.profiles where id = auth.uid()), false);
$fn$;
grant execute on function public.is_platform_admin() to authenticated;

-- Moderator guard: moderators OR admins.
create or replace function public.is_platform_mod()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select platform_role in ('moderator','admin') or is_admin from public.profiles where id = auth.uid()), false);
$fn$;
grant execute on function public.is_platform_mod() to authenticated;

-- ── Staff audit log + reward helper ─────────────────────────────────────────
create table if not exists public.staff_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_kind text,
  target_id   uuid,
  note        text,
  points      integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists staff_actions_actor_idx on public.staff_actions(actor_id, created_at desc);
create index if not exists staff_actions_created_idx on public.staff_actions(created_at desc);
alter table public.staff_actions enable row level security; -- server-only; read via RPC

create or replace function public._staff_log(p_actor uuid, p_action text, p_kind text, p_id uuid, p_note text, p_points int)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.staff_actions(actor_id, action, target_kind, target_id, note, points)
  values (p_actor, p_action, p_kind, p_id, nullif(btrim(coalesce(p_note,'')),''), coalesce(p_points,0));
  if coalesce(p_points,0) <> 0 then
    update public.profiles set mod_points = greatest(0, mod_points + p_points) where id = p_actor;
  end if;
end $fn$;

-- ── Notifications: allow a 'staff' kind (warnings, role changes) ─────────────
do $$ begin
  alter table public.notifications drop constraint if exists notifications_kind_check;
  alter table public.notifications add constraint notifications_kind_check
    check (kind in ('connection','application','message','match','staff'));
exception when others then null; end $$;

create or replace function public._notify(p_user uuid, p_title text, p_body text, p_ref uuid default null)
returns void language sql security definer set search_path = public as $fn$
  insert into public.notifications(user_id, kind, actor_id, title, body, ref_id)
  select p_user, 'staff', auth.uid(), p_title, p_body, p_ref
  where p_user is not null;
$fn$;

-- ── Content moderation: hide flag on posts ──────────────────────────────────
alter table public.project_posts add column if not exists hidden_at timestamptz;

-- ── Content reports (feeds the moderation queue) ────────────────────────────
create table if not exists public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('post','drop','user','message')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam','harassment','hate','nsfw','illegal','impersonation','misinformation','other')),
  detail      text,
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  escalated   boolean not null default false,
  resolution  text,
  handled_by  uuid references public.profiles(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='content_reports' and policyname='reports own read') then
    create policy "reports own read" on public.content_reports for select using (reporter_id = auth.uid());
  end if;
end $$;

create or replace function public.report_content(p_kind text, p_id uuid, p_reason text, p_detail text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); v uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_kind not in ('post','drop','user','message') then raise exception 'bad target'; end if;
  insert into public.content_reports(reporter_id, target_kind, target_id, reason, detail)
  values (uid, p_kind, p_id, p_reason, nullif(btrim(coalesce(p_detail,'')),''))
  on conflict (reporter_id, target_kind, target_id)
    do update set reason = excluded.reason, detail = excluded.detail, status = 'open', created_at = now()
  returning id into v;
  return v;
end $fn$;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;

-- Resolve the author behind any report target (for warnings / context).
create or replace function public._report_author(p_kind text, p_id uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select case p_kind
    when 'post'    then (select user_id from public.project_posts where id = p_id)
    when 'drop'    then (select author_id from public.drops where id = p_id)
    when 'message' then (select sender_id from public.room_messages where id = p_id)
    when 'user'    then p_id
  end;
$fn$;

-- ── Moderation queue + resolution ───────────────────────────────────────────
create or replace function public.mod_report_queue(p_status text default 'open', p_limit int default 60)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_mod() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'targetKind', r.target_kind, 'targetId', r.target_id,
    'reason', r.reason, 'detail', r.detail, 'status', r.status, 'escalated', r.escalated,
    'reporter', rep.username, 'createdAt', r.created_at,
    'reportCount', (select count(*) from public.content_reports c2
                    where c2.target_kind = r.target_kind and c2.target_id = r.target_id and c2.status = 'open'),
    'authorUsername', (select username from public.profiles where id = public._report_author(r.target_kind, r.target_id)),
    'snippet', case r.target_kind
       when 'post'    then (select left(coalesce(pp.title, pp.body, pp.kind), 140) from public.project_posts pp where pp.id = r.target_id)
       when 'drop'    then (select left(coalesce(d.title, d.body, 'drop'), 140) from public.drops d where d.id = r.target_id)
       when 'message' then (select left(m.body, 140) from public.room_messages m where m.id = r.target_id)
       when 'user'    then (select 'user @'||username from public.profiles where id = r.target_id)
     end,
    'handledBy', (select username from public.profiles where id = r.handled_by)
  ) order by r.escalated desc, r.created_at asc), '[]'::jsonb) end
  from public.content_reports r
  left join public.profiles rep on rep.id = r.reporter_id
  where (p_status is null or r.status = p_status)
  limit greatest(1, least(200, p_limit));
$fn$;
grant execute on function public.mod_report_queue(text, int) to authenticated;

-- Points per action — small, honest rewards; escalation is cheap, real cleanup pays more.
create or replace function public.mod_resolve_report(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me uuid := auth.uid();
  rep public.content_reports%rowtype;
  author uuid;
  pts int := 0;
  new_status text := 'resolved';
begin
  if not public.is_platform_mod() then raise exception 'moderator only'; end if;
  select * into rep from public.content_reports where id = p_id;
  if not found then raise exception 'report not found'; end if;
  if p_action not in ('dismiss','warn','hide','remove','escalate') then raise exception 'bad action'; end if;
  author := public._report_author(rep.target_kind, rep.target_id);

  if p_action = 'dismiss' then
    new_status := 'dismissed'; pts := 1;
  elsif p_action = 'warn' then
    pts := 2;
    perform public._notify(author, 'A moderator reviewed your content',
      'Please review the community guidelines — content was flagged as "'||rep.reason||'".', rep.target_id);
  elsif p_action = 'hide' then
    pts := 3;
    if rep.target_kind = 'post' then update public.project_posts set hidden_at = now() where id = rep.target_id; end if;
    perform public._notify(author, 'Your content was hidden', 'A moderator hid content flagged as "'||rep.reason||'".', rep.target_id);
  elsif p_action = 'remove' then
    pts := 4;
    if rep.target_kind = 'post' then update public.project_posts set hidden_at = now() where id = rep.target_id;
    elsif rep.target_kind = 'message' then delete from public.room_messages where id = rep.target_id; end if;
    perform public._notify(author, 'Your content was removed', 'A moderator removed content flagged as "'||rep.reason||'".', rep.target_id);
  elsif p_action = 'escalate' then
    new_status := 'open'; pts := 1;
    update public.content_reports set escalated = true where id = p_id;
    -- Ping every admin so a human with ban power can weigh in.
    insert into public.notifications(user_id, kind, actor_id, title, body, ref_id)
    select p.id, 'staff', me, 'Report escalated', 'A moderator escalated a "'||rep.reason||'" report for review.', rep.id
    from public.profiles p where p.platform_role = 'admin' or p.is_admin = true;
  end if;

  if p_action <> 'escalate' then
    update public.content_reports set status = new_status, resolution = p_action, handled_by = me, handled_at = now()
    where id = p_id;
    -- Fold in any duplicate open reports on the same target.
    update public.content_reports set status = new_status, resolution = p_action, handled_by = me, handled_at = now()
    where target_kind = rep.target_kind and target_id = rep.target_id and status = 'open' and id <> p_id;
  end if;

  perform public._staff_log(me, 'report_'||p_action, rep.target_kind, rep.target_id, p_note, pts);
  return jsonb_build_object('status', new_status, 'points', pts);
end $fn$;
grant execute on function public.mod_resolve_report(uuid, text, text) to authenticated;

-- ── Moderator rewards + leaderboard ─────────────────────────────────────────
create or replace function public.mod_stats()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_mod() then '{}'::jsonb else jsonb_build_object(
    'points', (select mod_points from public.profiles where id = auth.uid()),
    'resolved', (select count(*) from public.staff_actions where actor_id = auth.uid() and action like 'report_%'),
    'openReports', (select count(*) from public.content_reports where status = 'open'),
    'rank', (select count(*) + 1 from public.profiles p
             where p.platform_role in ('moderator','admin')
               and p.mod_points > coalesce((select mod_points from public.profiles where id = auth.uid()),0)),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('action', action, 'points', points, 'at', created_at) order by created_at desc), '[]'::jsonb)
               from (select * from public.staff_actions where actor_id = auth.uid() order by created_at desc limit 12) s),
    'leaderboard', (select coalesce(jsonb_agg(jsonb_build_object('username', username, 'points', mod_points, 'role', platform_role) order by mod_points desc), '[]'::jsonb)
                    from (select username, mod_points, platform_role from public.profiles
                          where platform_role in ('moderator','admin') order by mod_points desc limit 10) l)
  ) end;
$fn$;
grant execute on function public.mod_stats() to authenticated;

-- ── Moderator applications ──────────────────────────────────────────────────
create table if not exists public.mod_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  pitch          text not null,
  experience     text,
  hours_per_week int,
  timezone       text,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by    uuid references public.profiles(id) on delete set null,
  review_note    text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);
create unique index if not exists mod_app_one_pending on public.mod_applications(user_id) where status = 'pending';
create index if not exists mod_app_status_idx on public.mod_applications(status, created_at desc);
alter table public.mod_applications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mod_applications' and policyname='modapp own read') then
    create policy "modapp own read" on public.mod_applications for select using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.submit_mod_application(p_pitch text, p_experience text default null, p_hours int default null, p_timezone text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); v uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if length(btrim(coalesce(p_pitch,''))) < 20 then raise exception 'tell us a little more (20+ chars)'; end if;
  if public.is_platform_mod() then raise exception 'you are already staff'; end if;
  if exists (select 1 from public.mod_applications where user_id = uid and status = 'pending') then
    raise exception 'you already have a pending application';
  end if;
  insert into public.mod_applications(user_id, pitch, experience, hours_per_week, timezone)
  values (uid, btrim(p_pitch), nullif(btrim(coalesce(p_experience,'')),''), p_hours, nullif(btrim(coalesce(p_timezone,'')),''))
  returning id into v;
  return v;
end $fn$;
grant execute on function public.submit_mod_application(text, text, int, text) to authenticated;

create or replace function public.my_mod_application()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when auth.uid() is null then null else (
    select jsonb_build_object('id', id, 'status', status, 'pitch', pitch, 'reviewNote', review_note, 'createdAt', created_at, 'reviewedAt', reviewed_at)
    from public.mod_applications where user_id = auth.uid() order by created_at desc limit 1
  ) end;
$fn$;
grant execute on function public.my_mod_application() to authenticated;

create or replace function public.admin_list_mod_applications(p_status text default 'pending')
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'userId', a.user_id, 'username', pr.username,
    'pitch', a.pitch, 'experience', a.experience, 'hoursPerWeek', a.hours_per_week, 'timezone', a.timezone,
    'status', a.status, 'createdAt', a.created_at
  ) order by a.created_at asc), '[]'::jsonb) end
  from public.mod_applications a left join public.profiles pr on pr.id = a.user_id
  where (p_status is null or a.status = p_status);
$fn$;
grant execute on function public.admin_list_mod_applications(text) to authenticated;

create or replace function public.admin_review_mod_application(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare app public.mod_applications%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  select * into app from public.mod_applications where id = p_id;
  if not found then raise exception 'application not found'; end if;
  update public.mod_applications
    set status = case when p_approve then 'approved' else 'rejected' end,
        reviewed_by = auth.uid(), review_note = nullif(btrim(coalesce(p_note,'')),''), reviewed_at = now()
    where id = p_id;
  if p_approve then
    update public.profiles set platform_role = 'moderator' where id = app.user_id and platform_role <> 'admin';
    perform public._notify(app.user_id, 'Welcome to the VYBZ moderation team',
      'Your application was approved — you now have moderator access. Thank you for helping keep VYBZ real.', null);
    perform public._staff_log(auth.uid(), 'mod_approved', 'user', app.user_id, p_note, 0);
  else
    perform public._notify(app.user_id, 'Moderator application update',
      coalesce(nullif(btrim(coalesce(p_note,'')),''), 'Thanks for applying — we can''t take you on right now.'), null);
    perform public._staff_log(auth.uid(), 'mod_rejected', 'user', app.user_id, p_note, 0);
  end if;
end $fn$;
grant execute on function public.admin_review_mod_application(uuid, boolean, text) to authenticated;

-- ── Role administration (appoint / revoke) + staff roster + audit ───────────
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  if p_role not in ('member','moderator','admin') then raise exception 'bad role'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'you cannot demote yourself'; end if;
  update public.profiles set platform_role = p_role, is_admin = (p_role = 'admin') where id = p_user;
  perform public._staff_log(auth.uid(), 'set_role_'||p_role, 'user', p_user, null, 0);
  perform public._notify(p_user, 'Your VYBZ role changed',
    case p_role when 'admin' then 'You are now an administrator.'
                when 'moderator' then 'You are now a moderator — welcome to the team.'
                else 'Your staff role was updated.' end, null);
end $fn$;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

create or replace function public.admin_list_staff()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'userId', id, 'username', username, 'role', platform_role, 'points', mod_points,
    'resolved', (select count(*) from public.staff_actions s where s.actor_id = profiles.id and s.action like 'report_%')
  ) order by (platform_role='admin') desc, mod_points desc), '[]'::jsonb) end
  from public.profiles where platform_role in ('moderator','admin') or is_admin = true;
$fn$;
grant execute on function public.admin_list_staff() to authenticated;

create or replace function public.staff_audit(p_limit int default 60)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'actor', pr.username, 'action', s.action, 'targetKind', s.target_kind,
    'targetId', s.target_id, 'note', s.note, 'points', s.points, 'at', s.created_at
  ) order by s.created_at desc), '[]'::jsonb) end
  from (select * from public.staff_actions order by created_at desc limit greatest(1, least(200, p_limit))) s
  left join public.profiles pr on pr.id = s.actor_id;
$fn$;
grant execute on function public.staff_audit(int) to authenticated;

-- ── Recreate feed functions to hide moderated posts ─────────────────────────
create or replace function public.feed_posts(p_scope text default 'all', p_limit integer default 40)
returns jsonb language sql stable security definer set search_path = 'public' as $function$
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
      'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at, 'fx', pp.fx,
      'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
      'authorId', pr.user_id, 'authorUsername', prof.username,
      'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
      'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
    ) as obj, pp.created_at
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and pp.hidden_at is null
      and (pp.scheduled_at is null or pp.scheduled_at <= now() or pr.user_id = auth.uid())
      and (coalesce(pp.audience,'public') = 'public' or pr.user_id = auth.uid()
           or exists (select 1 from public.project_follows f where f.project_id = pr.id and f.user_id = auth.uid()))
      and case
        when p_scope = 'following' then exists (select 1 from public.project_follows f where f.project_id = pr.id and f.user_id = auth.uid())
        when p_scope = 'music'   then pp.kind = 'audio' or pr.kind = 'music'
        when p_scope = 'art'     then pp.kind = 'image' or pr.kind = 'art'
        when p_scope = 'video'   then pp.kind = 'video' or pr.kind = 'video'
        when p_scope = 'writing' then pr.kind = 'writing' or pp.kind = 'text'
        else true
      end
    order by pp.created_at desc
    limit greatest(1, least(100, p_limit))
  ) q;
$function$;
grant execute on function public.feed_posts(text, integer) to authenticated;

-- Member roster now surfaces platform_role + reward balance for role management.
create or replace function public.admin_list_members(p_q text default null, p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) end
  from (
    select jsonb_build_object(
      'userId', p.id, 'username', p.username, 'location', p.location,
      'isAdmin', p.is_admin, 'role', p.platform_role, 'points', p.mod_points, 'banned', p.banned,
      'createdAt', p.created_at,
      'modules', (select count(*) from public.profile_modules m where m.user_id = p.id and m.archived_at is null),
      'drops', (select count(*) from public.drops d where d.author_id = p.id)
    ) as x
    from public.profiles p
    where p_q is null or p_q = '' or p.username ilike '%'||p_q||'%'
    order by p.created_at desc
    limit greatest(1, least(200, p_limit))
  ) s;
$fn$;
grant execute on function public.admin_list_members(text, int) to authenticated;

create or replace function public.profile_project_detail(p_id uuid)
returns jsonb language sql stable security definer set search_path = 'public' as $function$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'userId', p.user_id, 'name', p.name, 'kind', p.kind,
    'tagline', p.tagline, 'accent', p.accent, 'coverUrl', p.cover_url,
    'followers', (select count(*) from public.project_follows pf where pf.project_id = p.id),
    'following', exists (select 1 from public.project_follows pf where pf.project_id = p.id and pf.user_id = auth.uid()),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
        'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at, 'fx', pp.fx,
        'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
        'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
      ) order by pp.created_at desc), '[]'::jsonb) from public.project_posts pp
      where pp.project_id = p.id
        and (pp.hidden_at is null or p.user_id = auth.uid())
        and (pp.scheduled_at is null or pp.scheduled_at <= now() or p.user_id = auth.uid())
        and (coalesce(pp.audience,'public') = 'public' or p.user_id = auth.uid()
             or exists (select 1 from public.project_follows f where f.project_id = p.id and f.user_id = auth.uid()))),
    'links', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pl.id, 'label', pl.label, 'url', pl.url, 'thumbUrl', pl.thumb_url,
        'targetProjectId', pl.target_project_id, 'sort', pl.sort
      ) order by pl.sort, pl.created_at), '[]'::jsonb) from public.project_links pl where pl.project_id = p.id)
  ) end
  from public.profile_projects p
  where p.id = p_id and (p.archived_at is null or p.user_id = auth.uid());
$function$;
grant execute on function public.profile_project_detail(uuid) to authenticated;
