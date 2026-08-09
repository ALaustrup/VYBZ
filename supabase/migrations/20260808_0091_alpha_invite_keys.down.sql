-- Rollback OR-023 alpha invite keys (drops RPCs + tables; leaves alpha_access_at).
set search_path = public;

drop function if exists public.admin_list_invite_keys(integer);
drop function if exists public.admin_revoke_invite_keys(text, uuid);
drop function if exists public.admin_grant_alpha_access(uuid, text);
drop function if exists public.redeem_invite_key(text);
drop function if exists public.mint_invite_keys(integer, text, text, integer, integer);
drop function if exists public.has_alpha_access();
drop function if exists public._invite_hash_code(text);
drop function if exists public._invite_normalize_code(text);

drop table if exists public.invite_redemptions;
drop table if exists public.invite_keys;

-- Entitlement column intentionally retained so rollback does not strip access flags.
