-- Phase 1 smoke seed: randomized vibes + geo clusters + social connections.
-- Targets @vybz.demo mocks only. Idempotent (upserts facets / connections).
-- Password unchanged: VybzDemo2026!

do $$
declare
  r record;
  ids uuid[];
  a uuid;
  b uuid;
  i int;
  j int;
  status text;
  n int;
begin
  select coalesce(array_agg(p.id order by p.username), '{}')
  into ids
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@vybz.demo';

  if cardinality(ids) = 0 then
    raise notice 'No @vybz.demo users — run seed-mock-creators.sql first';
    return;
  end if;

  -- Persona packs by username (deterministic “random” mix)
  for r in
    select p.id, p.username, p.location, p.profile
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email like '%@vybz.demo'
  loop
    update public.profiles p set
      -- Soft “new user” window for half the cohort (vibe card freshness)
      created_at = case
        when r.username in ('devonblake','mayachen','elliepark','rileyfrost','camholloway','kaimoreno','aishab')
          then now() - (interval '1 day' * (1 + (abs(hashtext(r.username)) % 10)))
        else coalesce(p.created_at, now() - interval '40 days')
      end,
      lat = case r.username
        when 'devonblake' then 45.5152
        when 'camholloway' then 45.5231   -- Portland cluster (moved pin for smoke)
        when 'rileyfrost' then 45.5048
        when 'mayachen' then 34.0522
        when 'kaimoreno' then 34.0736
        when 'jordanreed' then 33.7490
        when 'elliepark' then 40.6782
        when 'aishab' then 40.7128
        when 'sofiaalvarez' then 25.7617
        when 'nateoko' then 51.5074
        when 'marcusvale' then 52.5200
        when 'diegosantos' then -23.5505
        when 'yukitanaka' then 35.6762
        when 'priyasharma' then 43.6532
        else p.lat
      end,
      lng = case r.username
        when 'devonblake' then -122.6784
        when 'camholloway' then -122.6765
        when 'rileyfrost' then -122.6890
        when 'mayachen' then -118.2437
        when 'kaimoreno' then -118.4004
        when 'jordanreed' then -84.3880
        when 'elliepark' then -73.9442
        when 'aishab' then -74.0060
        when 'sofiaalvarez' then -80.1918
        when 'nateoko' then -0.1278
        when 'marcusvale' then 13.4050
        when 'diegosantos' then -46.6333
        when 'yukitanaka' then 139.6503
        when 'priyasharma' then -79.3832
        else p.lng
      end,
      location = case r.username
        when 'camholloway' then 'Portland, OR'
        when 'rileyfrost' then 'Portland, OR'
        else p.location
      end,
      profile = coalesce(p.profile, '{}'::jsonb) || jsonb_build_object(
        'interests', to_jsonb(case r.username
          when 'devonblake' then array['Nature & outdoors','Hiking','Camping','Live music']
          when 'camholloway' then array['Nature & outdoors','Hiking','Coffee','Photography']
          when 'rileyfrost' then array['Hiking','Nature & outdoors','Festivals','Songwriting']
          when 'mayachen' then array['Nightlife','Live music','Sampling','DJing']
          when 'kaimoreno' then array['Live music','Festivals','Fashion','Coffee']
          when 'jordanreed' then array['Nightlife','Fitness','Live music','Gaming']
          when 'elliepark' then array['Coffee','Reading','Art','Film & cinema']
          when 'aishab' then array['Art','Fashion','Coffee','Nightlife']
          when 'sofiaalvarez' then array['Travel','Fitness','Live music','Foodie']
          when 'nateoko' then array['Travel','Nightlife','Festivals','DJing']
          when 'marcusvale' then array['Nightlife','Film & cinema','Design','Wellness']
          when 'diegosantos' then array['Festivals','Foodie','Travel','Live music']
          when 'yukitanaka' then array['Gaming','Art','Film & cinema','Coffee']
          when 'priyasharma' then array['Wellness','Reading','Coffee','Volunteering']
          else array['Live music','Coffee']
        end),
        'meetupIntents', to_jsonb(case r.username
          when 'devonblake' then array['Hiking partner','Local hang','Concert buddy']
          when 'camholloway' then array['Hiking partner','Coffee hang','Creative cowork']
          when 'rileyfrost' then array['Hiking partner','Jam session','Local hang']
          when 'mayachen' then array['Jam session','Concert buddy','Nightlife']
          when 'kaimoreno' then array['Concert buddy','Coffee hang','Local hang']
          when 'elliepark' then array['Coffee hang','Study buddy','Creative cowork']
          when 'aishab' then array['Coffee hang','Local hang','Concert buddy']
          when 'sofiaalvarez' then array['Gym buddy','Travel companion','Concert buddy']
          else array['Local hang','Coffee hang']
        end),
        'lookingFor', to_jsonb(case r.username
          when 'devonblake' then array['Friendship','Activity partner','Just exploring']
          when 'camholloway' then array['Friendship','Activity partner','Collaborator']
          when 'rileyfrost' then array['Friendship','Collaborator','Activity partner']
          when 'mayachen' then array['Collaborator','Dating','Friendship']
          when 'kaimoreno' then array['Dating','Friendship','Something casual']
          when 'jordanreed' then array['Collaborator','Friendship','Dating']
          when 'elliepark' then array['Friendship','Just exploring','Collaborator']
          when 'aishab' then array['Dating','Friendship','Activity partner']
          else array['Collaborator','Friendship','Just exploring']
        end),
        'matchRadiusMiles', 100,
        'shareAge', true,
        'shareSex', (abs(hashtext(r.username)) % 2 = 0),
        'shareLocation', true,
        'birthYear', 1988 + (abs(hashtext(r.username)) % 18),
        'sex', (array['Woman','Man','Non-binary','Prefer not to say'])[1 + (abs(hashtext(r.username || 'sex')) % 4)],
        'remoteOk', true
      )
    where p.id = r.id;
  end loop;

  -- Randomized connection graph among demos (skip self / duplicates)
  n := cardinality(ids);
  for i in 1..n loop
    for j in (i + 1)..n loop
      -- ~45% of pairs get a connection edge
      if (abs(hashtext(ids[i]::text || ids[j]::text)) % 100) < 45 then
        a := ids[i];
        b := ids[j];
        -- Randomize requester direction
        if (abs(hashtext(a::text || 'dir' || b::text)) % 2) = 0 then
          null; -- a -> b
        else
          a := ids[j];
          b := ids[i];
        end if;
        status := case (abs(hashtext(a::text || b::text || 'st')) % 10)
          when 0 then 'declined'
          when 1 then 'pending'
          when 2 then 'pending'
          else 'accepted'
        end;
        insert into public.connections (requester_id, addressee_id, status, created_at)
        values (a, b, status, now() - (interval '1 hour' * (1 + abs(hashtext(a::text || b::text)) % 200)))
        on conflict (requester_id, addressee_id) do update
          set status = excluded.status;
      end if;
    end loop;
  end loop;

  -- Recompute social scores for demos
  for r in
    select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email like '%@vybz.demo'
  loop
    perform public.recompute_social_score(r.id);
  end loop;

  raise notice 'Vibe smoke seed complete for % demo users', n;
end $$;

-- Quick inventory
select
  (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email like '%@vybz.demo') as demos,
  (select count(*) from public.social_scores s join auth.users u on u.id = s.user_id where u.email like '%@vybz.demo' and s.matchable) as matchable_demos,
  (select count(*) from public.connections c
     where exists (select 1 from auth.users u where u.id = c.requester_id and u.email like '%@vybz.demo')
       and exists (select 1 from auth.users u where u.id = c.addressee_id and u.email like '%@vybz.demo')) as demo_connections;
