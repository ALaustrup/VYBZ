set search_path = public, extensions;
drop function if exists public.bind_session_stored_audio(uuid, uuid);
drop function if exists public.session_stored_audio(uuid);
