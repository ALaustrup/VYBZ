-- AI Visualizer Studio: rate-limit + Vc spend for still generation.
-- Fee: 2 Vc per generate · cap: 10 generates / UTC day.

alter table public.vc_tx_ledger drop constraint if exists vc_tx_ledger_kind_check;
alter table public.vc_tx_ledger add constraint vc_tx_ledger_kind_check
  check (kind in (
    'signup_grant', 'social_earn', 'p2p', 'topup',
    'spend_cosmetic', 'spend_room', 'spend_repo', 'mod_reward', 'adjustment',
    'visual_generate'
  ));

create table if not exists public.visual_generate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  style_preset text not null default 'glass',
  prompt_hash text not null,
  credits numeric(18,4) not null default 2,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists visual_generate_events_user_day_idx
  on public.visual_generate_events (user_id, created_at desc);

alter table public.visual_generate_events enable row level security;

drop policy if exists visual_generate_events_own on public.visual_generate_events;
create policy visual_generate_events_own on public.visual_generate_events
  for select using (user_id = auth.uid() or public.is_platform_admin());

grant select on public.visual_generate_events to authenticated;

-- Debit Vc + enforce daily cap. Called by Edge with service role after auth.
-- Returns jsonb: { ok, credits, remaining_today, error? }
create or replace function public.vc_spend_visual_generate(
  p_user_id uuid,
  p_style text default 'glass',
  p_prompt_hash text default '',
  p_cost numeric default 2,
  p_daily_cap int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  bal numeric(18,4);
  used int;
  cost numeric(18,4) := round(greatest(0.01, coalesce(p_cost, 2))::numeric, 4);
  cap int := greatest(1, coalesce(p_daily_cap, 10));
  day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  lid uuid;
  eid uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  select count(*)::int into used
  from public.visual_generate_events
  where user_id = p_user_id and created_at >= day_start;

  if used >= cap then
    return jsonb_build_object('ok', false, 'error', 'daily_cap', 'remaining_today', 0, 'credits', (
      select coalesce(mod_points, 0) from public.profiles where id = p_user_id
    ));
  end if;

  select mod_points into bal from public.profiles where id = p_user_id for update;
  if bal is null then
    return jsonb_build_object('ok', false, 'error', 'profile_missing');
  end if;
  if bal < cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_vc', 'credits', bal, 'remaining_today', cap - used);
  end if;

  lid := public._vc_apply(
    p_user_id, null, cost, 'visual_generate', 'visual', coalesce(nullif(p_style, ''), 'glass'),
    'AI visualizer still · Studio',
    'visual_gen:' || p_user_id::text || ':' || extract(epoch from now())::text || ':' || substr(md5(random()::text), 1, 8),
    jsonb_build_object('style', p_style, 'prompt_hash', p_prompt_hash)
  );

  insert into public.visual_generate_events (user_id, style_preset, prompt_hash, credits)
  values (p_user_id, coalesce(nullif(p_style, ''), 'glass'), coalesce(p_prompt_hash, ''), cost)
  returning id into eid;

  return jsonb_build_object(
    'ok', true,
    'credits', (select coalesce(mod_points, 0) from public.profiles where id = p_user_id),
    'remaining_today', cap - used - 1,
    'ledger_id', lid,
    'event_id', eid
  );
end;
$fn$;

revoke all on function public.vc_spend_visual_generate(uuid, text, text, numeric, int) from public, anon, authenticated;
-- Edge uses service_role (bypasses revoke for postgres roles that own it; grant to service via default).
grant execute on function public.vc_spend_visual_generate(uuid, text, text, numeric, int) to service_role;
