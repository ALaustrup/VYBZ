-- Revert the station line. Vibes Radio returns to picking randomly from the
-- pool, which still works — it just stops being a queue anyone can see
-- themselves in.

set search_path = public, extensions;

drop function if exists public.mark_airing_aired(uuid);
drop function if exists public.claim_next_airing();
drop function if exists public.station_line(uuid);
drop function if exists public.cancel_station_airing(uuid);
drop function if exists public.submit_to_station(uuid);

drop table if exists public.station_airings;
