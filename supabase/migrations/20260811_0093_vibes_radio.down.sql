-- Down: OR-043 Vibes Radio
set search_path = public, extensions;

drop policy if exists vibes_radio_pool_update_own on public.vibes_radio_pool;
drop policy if exists vibes_radio_pool_insert_own on public.vibes_radio_pool;
drop policy if exists vibes_radio_pool_select_active on public.vibes_radio_pool;
drop policy if exists vibes_radio_queue_select on public.vibes_radio_queue;
drop policy if exists vibes_radio_broadcast_select on public.vibes_radio_broadcast;

drop table if exists public.vibes_radio_broadcast;
drop table if exists public.vibes_radio_queue;
drop table if exists public.vibes_radio_pool;
