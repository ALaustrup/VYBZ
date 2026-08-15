-- Revert self-serve alpha keys. Admin minting and redemption are unaffected.
--
-- Existing self-issued keys are revoked rather than deleted so the redemption
-- history stays intact.

set search_path = public, extensions;

drop function if exists public.admin_self_key_chain(integer);
drop function if exists public.issue_self_alpha_key(text, text);

update public.invite_keys
   set revoked_at = coalesce(revoked_at, now())
 where source = 'self'
   and redeemed_count = 0;

drop table if exists public.alpha_key_requests;

-- Columns are left in place: dropping them would discard the email -> account
-- attribution for keys that were already redeemed.
