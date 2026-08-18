-- Session provenance — measured live-mix evidence. Additive.
-- Does not prove the audio was not AI-generated.
-- Does not change ATC grant/earn/consume formulas.
-- Does not replace provenance_ledger / watermark / C2PA.

set search_path = public, extensions;

alter table public.provenance_ledger drop constraint if exists provenance_ledger_event_type_check;
alter table public.provenance_ledger
  add constraint provenance_ledger_event_type_check
  check (event_type in (
    'mint', 'download', 'license', 'transfer', 'watermark', 'c2pa', 'human_session'
  ));

create table if not exists public.provenance_sessions (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null unique references public.live_sessions(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'sealed')),
  strength text check (strength is null or strength in ('thin', 'full')),
  event_count int not null default 0 check (event_count >= 0),
  chain_root text,
  atc_burned int not null default 0 check (atc_burned >= 0),
  opened_at timestamptz not null default now(),
  sealed_at timestamptz,
  manifest jsonb not null default '{}'::jsonb
);

create index if not exists provenance_sessions_host_idx
  on public.provenance_sessions (host_id, opened_at desc);

create table if not exists public.provenance_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.provenance_sessions(id) on delete cascade,
  seq int not null check (seq >= 1),
  event_type text not null check (event_type in ('open', 'atc_burn', 'signal', 'seal')),
  payload jsonb not null default '{}'::jsonb,
  airtime_ledger_id uuid references public.airtime_ledger(id) on delete set null,
  prev_hash text not null,
  row_hash text not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists provenance_events_session_idx
  on public.provenance_events (session_id, seq);

alter table public.provenance_sessions enable row level security;
alter table public.provenance_events enable row level security;

drop policy if exists "provenance_sessions host read" on public.provenance_sessions;
create policy "provenance_sessions host read"
  on public.provenance_sessions for select using (host_id = auth.uid());

drop policy if exists "provenance_events host read" on public.provenance_events;
create policy "provenance_events host read"
  on public.provenance_events for select using (
    exists (
      select 1 from public.provenance_sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );

grant select on public.provenance_sessions to authenticated;
grant select on public.provenance_events to authenticated;

create or replace function public._provenance_append(
  p_session uuid,
  p_type text,
  p_payload jsonb,
  p_ledger uuid
)
returns public.provenance_events
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  prev text;
  nxt int;
  body text;
  rh text;
  ev public.provenance_events;
begin
  if p_type not in ('open', 'atc_burn', 'signal', 'seal') then
    raise exception 'invalid_event_type';
  end if;

  select coalesce(max(seq), 0) into nxt from public.provenance_events where session_id = p_session;
  nxt := nxt + 1;
  select row_hash into prev
  from public.provenance_events
  where session_id = p_session
  order by seq desc
  limit 1;
  prev := coalesce(prev, repeat('0', 64));
  body := p_type || '|' || nxt::text || '|' || coalesce(p_payload::text, '{}') || '|' || prev;
  rh := encode(digest(body, 'sha256'), 'hex');

  insert into public.provenance_events (
    session_id, seq, event_type, payload, airtime_ledger_id, prev_hash, row_hash
  ) values (
    p_session, nxt, p_type, coalesce(p_payload, '{}'::jsonb), p_ledger, prev, rh
  ) returning * into ev;

  update public.provenance_sessions
    set event_count = nxt, chain_root = rh
  where id = p_session;

  return ev;
end
$fn$;
revoke all on function public._provenance_append(uuid, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public._provenance_append(uuid, text, jsonb, uuid) to service_role;

create or replace function public.open_provenance_session(p_live uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  live public.live_sessions%rowtype;
  rec public.provenance_sessions;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  select * into live from public.live_sessions where id = p_live;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if live.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into rec from public.provenance_sessions where live_session_id = p_live;
  if found then
    return jsonb_build_object(
      'ok', true,
      'id', rec.id,
      'status', rec.status,
      'strength', rec.strength,
      'existing', true
    );
  end if;

  insert into public.provenance_sessions (live_session_id, host_id)
  values (p_live, uid)
  returning * into rec;

  perform public._provenance_append(
    rec.id, 'open', jsonb_build_object('live_session_id', p_live), null
  );

  return jsonb_build_object(
    'ok', true,
    'id', rec.id,
    'status', 'open',
    'strength', null,
    'existing', false
  );
end
$fn$;
grant execute on function public.open_provenance_session(uuid) to authenticated;
revoke all on function public.open_provenance_session(uuid) from anon, public;

create or replace function public.append_provenance_event(
  p_session uuid,
  p_type text,
  p_payload jsonb default '{}'::jsonb,
  p_ledger uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.provenance_sessions;
  led public.airtime_ledger%rowtype;
  ev public.provenance_events;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if p_type not in ('atc_burn', 'signal') then
    return jsonb_build_object('ok', false, 'error', 'invalid_event_type');
  end if;

  select * into rec from public.provenance_sessions where id = p_session;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if rec.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'sealed');
  end if;

  if p_ledger is not null then
    select * into led from public.airtime_ledger where id = p_ledger;
    if not found or led.user_id <> uid
       or led.source_live_session_id <> rec.live_session_id
       or led.type <> 'host_consume' then
      return jsonb_build_object('ok', false, 'error', 'ledger_mismatch');
    end if;
  end if;

  ev := public._provenance_append(p_session, p_type, p_payload, p_ledger);
  return jsonb_build_object('ok', true, 'seq', ev.seq, 'row_hash', ev.row_hash);
end
$fn$;
grant execute on function public.append_provenance_event(uuid, text, jsonb, uuid) to authenticated;
revoke all on function public.append_provenance_event(uuid, text, jsonb, uuid) from anon, public;

create or replace function public.seal_provenance_session(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.provenance_sessions;
  burned int;
  strength text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  select * into rec from public.provenance_sessions where id = p_session for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if rec.status = 'sealed' then
    return jsonb_build_object(
      'ok', true,
      'id', rec.id,
      'status', 'sealed',
      'strength', rec.strength,
      'atc_burned', rec.atc_burned,
      'chain_root', rec.chain_root,
      'existing', true
    );
  end if;

  select coalesce(sum(-l.amount), 0)::int into burned
  from public.airtime_ledger l
  where l.source_live_session_id = rec.live_session_id
    and l.user_id = rec.host_id
    and l.type = 'host_consume'
    and l.amount < 0;

  strength := case when burned > 0 then 'full' else 'thin' end;

  perform public._provenance_append(
    rec.id,
    'seal',
    jsonb_build_object('atc_burned', burned, 'strength', strength),
    null
  );

  update public.provenance_sessions
    set status = 'sealed',
        strength = strength,
        atc_burned = burned,
        sealed_at = now(),
        manifest = jsonb_build_object(
          'live_session_id', rec.live_session_id,
          'host_id', rec.host_id,
          'atc_burned', burned,
          'strength', strength,
          'not_ai_claim', 'Not measured'
        )
  where id = rec.id
  returning * into rec;

  perform public.ledger_append(
    'human_session',
    null,
    rec.host_id,
    jsonb_build_object(
      'provenance_session_id', rec.id,
      'live_session_id', rec.live_session_id,
      'strength', strength,
      'atc_burned', burned
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', rec.id,
    'status', 'sealed',
    'strength', rec.strength,
    'atc_burned', rec.atc_burned,
    'chain_root', rec.chain_root
  );
end
$fn$;
grant execute on function public.seal_provenance_session(uuid) to authenticated;
revoke all on function public.seal_provenance_session(uuid) from anon, public;

comment on table public.provenance_sessions is
  'Measured live-mix session provenance. Not an AI-negative proof. Not Living Mix.';
comment on table public.provenance_events is
  'Per-session hash chain. atc_burn is measured; signal payloads are declared.';
