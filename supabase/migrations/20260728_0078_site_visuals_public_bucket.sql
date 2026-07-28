-- Public catalog for encoded site backdrop + VDock loops (not user uploads).
-- Masters stay local in vizualz/; only browser-ready encodes land here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-visuals',
  'site-visuals',
  true,
  104857600,
  array['video/webm', 'video/mp4', 'image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site-visuals public read" on storage.objects;
create policy "site-visuals public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'site-visuals');

-- No insert/update/delete policies for anon/authenticated — service role / CLI only.
