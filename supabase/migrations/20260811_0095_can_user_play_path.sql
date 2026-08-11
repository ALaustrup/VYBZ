-- Private-by-default playback, step 1 of 4.
--
-- `drops` SELECT is gated by can_view_drop, but the audio is not: the assets row
-- exposes its storage path to anyone, and `audio-assets` storage read is granted to
-- every authenticated user with no owner scoping. Marking a track private therefore
-- hides the row while leaving the file fetchable.
--
-- The fix is to make `audio-play` the single playback authority. It holds service
-- role, so auth.uid() is null inside it and can_view_drop cannot be used directly.
-- This is the same visibility rule with the viewer passed explicitly.
--
-- Steps 2-4 (client routes all playback through tickets; lock storage read to owner;
-- stop exposing assets.url) follow once this is deployed and verified.

create or replace function public.can_user_play_path(p_user uuid, p_path text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    -- Your own upload, whether or not it is attached to a drop.
    exists (
      select 1 from public.assets a
      where a.url = p_path and a.owner_id = p_user
    )
    -- Otherwise it must be reachable through a drop you are allowed to see.
    or exists (
      select 1
        from public.drops d
        join public.assets a on a.id = d.asset_id
       where a.url = p_path
         and (
           coalesce(d.audience, 'public') = 'public'
           or d.author_id = p_user
           or (
             coalesce(d.audience, 'public') = 'followers'
             and p_user is not null
             and exists (
               select 1 from public.connections c
               where c.status = 'accepted'
                 and ((c.requester_id = d.author_id and c.addressee_id = p_user)
                   or (c.addressee_id = d.author_id and c.requester_id = p_user))
             )
           )
           or (
             coalesce(d.audience, 'public') = 'private'
             and p_user is not null
             and exists (
               select 1 from public.drop_invites i
               where i.drop_id = d.id and i.invitee_id = p_user
             )
           )
         )
    );
$$;

-- Only the edge function may ask this question.
revoke all on function public.can_user_play_path(uuid, text) from public;
revoke all on function public.can_user_play_path(uuid, text) from anon;
revoke all on function public.can_user_play_path(uuid, text) from authenticated;
grant execute on function public.can_user_play_path(uuid, text) to service_role;
