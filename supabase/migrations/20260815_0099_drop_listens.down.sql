-- Revert listen measurement. drop_plays and everything else are untouched.

set search_path = public, extensions;

drop function if exists public.listen_dropoff(uuid, integer);
drop function if exists public.listen_report(uuid);
drop function if exists public.record_listen(uuid, uuid, numeric, numeric, boolean);

drop table if exists public.drop_listens;
