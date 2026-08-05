-- Reverse 20260805_0090_pro_hosting.sql
--
-- Keeps `profiles.pro_until` and every `spend_pro` ledger row. Dropping the
-- column would destroy paid entitlements, and the ledger is append-only by
-- design. Only the callable surface is removed.

set search_path = public, extensions;

drop function if exists public.purchase_pro(numeric);
drop function if exists public.pro_status();

-- The kind check is left widened. Narrowing it would fail against any
-- 'spend_pro' row already written, and rejecting a real past transaction would
-- be worse than an unused enum value.
