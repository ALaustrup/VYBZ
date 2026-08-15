-- Revert sparks. Drops and their audio are untouched.

set search_path = public, extensions;

drop function if exists public.spark_report(uuid);
drop function if exists public.answer_spark(uuid, smallint);
drop function if exists public.mark_spark_shown(uuid);
drop function if exists public.place_track_spark(uuid, numeric, text, text, jsonb);

drop table if exists public.spark_responses;
drop table if exists public.track_sparks;
