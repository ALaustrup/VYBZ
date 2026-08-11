-- Reverse 20260811_0095_can_user_play_path.
-- Safe to drop only while audio-play still tolerates a missing function; see the
-- edge handler, which fails closed if the visibility check cannot be evaluated.

drop function if exists public.can_user_play_path(uuid, text);
