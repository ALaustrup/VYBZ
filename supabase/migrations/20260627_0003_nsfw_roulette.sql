-- ===========================================================================
-- NSFW random chat (MYVYB Roulette, adult-only pool).
--
-- Adds an opt-in NSFW lane to random chat so verified adults can be matched
-- specifically for sensitive 1:1 conversation (Sext / Role Play / Show-n-Tell).
-- This is the same age-layer machinery, hardened:
--   • the NSFW lane is a SEPARATE pool from the normal lane (no cross-matching);
--   • it is restricted to the 'adult' (18+) layer; and
--   • it additionally requires the caller to have nsfw_opt_in = true — i.e. a
--     verified email + permanent 18+ age on file + the single Settings toggle.
-- Eligibility is enforced entirely server-side: the function simply refuses
-- (eligible = false) if the caller doesn't qualify, so the client can trust it.
-- ===========================================================================

-- 1. Per-queue-entry NSFW flag. Keeps the two lanes from ever cross-matching. --
alter table public.roulette_queue
  add column if not exists nsfw boolean not null default false;

-- 2. roulette_enqueue(p_nsfw) — lane-aware matching. --------------------------
-- Output contract is unchanged (session_id, partner_id, waiting, eligible); we
-- just add the p_nsfw parameter and the adult/opt-in gate for the NSFW lane.
drop function if exists public.roulette_enqueue();
drop function if exists public.roulette_enqueue(boolean);

create or replace function public.roulette_enqueue(p_nsfw boolean default false)
returns table(session_id uuid, partner_id uuid, waiting boolean, eligible boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_age int; my_layer text; anon boolean; is_banned boolean; opted_in boolean;
  partner uuid; new_session uuid;
begin
  if uid is null then
    return query select null::uuid, null::uuid, false, false; return;
  end if;

  select age, coalesce(anonymous,false), coalesce(banned,false),
         coalesce(nsfw_opt_in,false)
    into my_age, anon, is_banned, opted_in
    from public.profiles where id = uid;

  -- Base eligibility: a real (non-guest), non-banned account with an age on file.
  if anon or is_banned or my_age is null then
    return query select null::uuid, null::uuid, false, false; return;
  end if;

  my_layer := case when my_age < 18 then 'teen' else 'adult' end;

  -- NSFW lane is adults-only AND requires the universal opt-in to be ON.
  if p_nsfw and (my_layer <> 'adult' or not opted_in) then
    return query select null::uuid, null::uuid, false, false; return;
  end if;

  -- Match only inside the same age layer AND the same NSFW lane.
  select q.user_id into partner
  from public.roulette_queue q
  where q.user_id <> uid
    and q.age_layer = my_layer
    and q.nsfw = p_nsfw
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = uid and b.blocked_id = q.user_id)
         or (b.blocker_id = q.user_id and b.blocked_id = uid)
    )
  order by q.enqueued_at asc
  limit 1 for update skip locked;

  if partner is not null then
    delete from public.roulette_queue where user_id in (partner, uid);
    insert into public.roulette_sessions(a, b) values (partner, uid)
      returning id into new_session;
    return query select new_session, partner, false, true;
  else
    insert into public.roulette_queue(user_id, age_layer, nsfw)
      values (uid, my_layer, p_nsfw)
      on conflict (user_id) do update
        set enqueued_at = now(),
            age_layer = excluded.age_layer,
            nsfw = excluded.nsfw;
    return query select null::uuid, null::uuid, true, true;
  end if;
end $$;

grant execute on function public.roulette_enqueue(boolean) to authenticated;
