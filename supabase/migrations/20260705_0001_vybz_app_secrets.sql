-- VYBZ bootstrap: app_secrets for push delivery + admin claim.
-- push_send_secret must match Edge Function env PUSH_SEND_SECRET (set via dashboard/CLI).

insert into public.app_secrets (key, value) values
  ('admin_claim_code', 'VYBZ-C1C1C31D'),
  ('push_send_url', 'https://xixmneooyufbeftdfpcm.functions.supabase.co/push-send'),
  ('push_send_secret', 'd1383f4c085b1c450c74cfe1414d755de5b2c91b61c94a2a592a1e0f70a42b98')
on conflict (key) do update set value = excluded.value;
