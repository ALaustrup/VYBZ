-- Drop game infrastructure. MYVYB's product direction is moving to live
-- streaming (see 20260626_0002_live_streams.sql); games are archived on the
-- main-arcade-backup branch in case we want any of it back.
--
-- This is destructive — the live system has no UI surface for any of these
-- objects after the corresponding client-side purge, so dropping is safe.

drop function if exists public.award_game_credits(text, int);
drop function if exists public.game_leaderboard(text, int, boolean);
drop function if exists public.my_game_rank(text);
drop function if exists public.friends_recent_plays(int);
drop function if exists public.grant_achievement(text);

drop table if exists public.game_scores cascade;
drop table if exists public.achievements cascade;
