-- ===========================================================================
-- VYBZ — Weekly digest week-in-review bundle (stats + matches + opportunities).
-- Service-role only; used by edge function weekly-digest.
-- ===========================================================================

set search_path = public, extensions;

create or replace function public.digest_week_bundle(
  p_user uuid,
  p_week date default public.digest_week_start()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  week_ts timestamptz;
  listens int := 0;
  feels int := 0;
  wilds int := 0;
  tips_cents int := 0;
  tips_count int := 0;
  credits_bal int := 0;
  credits_bought int := 0;
  uname text;
  matches jsonb := '[]'::jsonb;
  opps jsonb := '[]'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role only';
  end if;
  if p_user is null then
    raise exception 'p_user required';
  end if;

  week_ts := p_week::timestamptz;

  select username, coalesce(mod_points, 0)
    into uname, credits_bal
  from public.profiles
  where id = p_user;

  select count(*)::int into listens
  from public.drop_plays dp
  join public.drops d on d.id = dp.drop_id
  where d.author_id = p_user
    and dp.user_id <> p_user
    and dp.created_at >= week_ts;

  select
    count(*) filter (where r.reaction = 'feel')::int,
    count(*) filter (where r.reaction = 'wild')::int
  into feels, wilds
  from public.reactions r
  join public.drops d on d.id = r.drop_id
  where d.author_id = p_user
    and r.user_id <> p_user
    and r.created_at >= week_ts;

  select
    coalesce(sum(t.amount_cents), 0)::int,
    count(*)::int
  into tips_cents, tips_count
  from public.tips t
  where t.to_user = p_user
    and t.status = 'paid'
    and coalesce(t.paid_at, t.created_at) >= week_ts;

  select coalesce(sum(c.credits), 0)::int into credits_bought
  from public.credit_topups c
  where c.user_id = p_user
    and c.status = 'paid'
    and coalesce(c.paid_at, c.created_at) >= week_ts;

  -- Impersonate subject for match + opportunity RPCs that key off auth.uid().
  perform set_config('request.jwt.claim.sub', p_user::text, true);

  select coalesce(jsonb_agg(to_jsonb(m) order by m.fit desc nulls last), '[]'::jsonb)
  into matches
  from (
    select
      cm.user_id,
      cm.username,
      cm.offers_you_seek,
      cm.seeks_you_offer,
      cm.mutual,
      cm.fit,
      cm.confidence,
      cm.shared_genres
    from public.collab_matches(5, null, null, null, null) cm
  ) m;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.fit desc nulls last), '[]'::jsonb)
  into opps
  from (
    select
      opp.id,
      opp.title,
      opp.kind,
      opp.budget,
      opp.role_label as "roleLabel",
      opp.fit,
      opp.author_username as "authorUsername"
    from public.my_opportunities(20) opp
    where opp.created_at >= week_ts
    limit 3
  ) o;

  return jsonb_build_object(
    'weekStart', p_week,
    'username', uname,
    'listens', listens,
    'feels', feels,
    'wilds', wilds,
    'tipsCents', tips_cents,
    'tipsCount', tips_count,
    'creditsBalance', credits_bal,
    'creditsBought', credits_bought,
    'matches', matches,
    'opportunities', opps
  );
end;
$fn$;

revoke all on function public.digest_week_bundle(uuid, date) from public, anon, authenticated;
grant execute on function public.digest_week_bundle(uuid, date) to service_role;
