-- VYBZ v1 — small follow-up policies for client-side reads.
set search_path = public, extensions;

-- Let a user see their own rating (aggregate avg/count live on the asset row).
drop policy if exists "ratings read own" on public.track_ratings;
create policy "ratings read own" on public.track_ratings for select using (user_id = auth.uid());
grant select, insert, update, delete on public.track_ratings to authenticated;
