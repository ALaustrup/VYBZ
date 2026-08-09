-- ===========================================================================
-- One-time account password lock (master alpha reset).
-- Client sets the Auth password via updateUser, then calls lock_account_password
-- so the gate never reappears. Plaintext passwords are never stored in Postgres.
-- ===========================================================================

set search_path = public;

alter table public.profiles
  add column if not exists password_locked_at timestamptz;

comment on column public.profiles.password_locked_at is
  'When the account password was locked via the one-time lock screen. Null = must set.';

-- Master must re-lock after the alpha account wipe (do not copy any prior password).
update public.profiles p
set password_locked_at = null
where p.id in (
  select u.id from auth.users u
  where lower(u.email) = lower('andrewiguess@gmail.com')
);

create or replace function public.lock_account_password()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  locked timestamptz;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  if exists (select 1 from public.profiles where id = uid and coalesce(banned, false)) then
    return jsonb_build_object('ok', false, 'reason', 'account_unavailable');
  end if;

  select password_locked_at into locked from public.profiles where id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'profile_missing');
  end if;
  if locked is not null then
    return jsonb_build_object('ok', true, 'already', true, 'lockedAt', locked);
  end if;

  update public.profiles
  set password_locked_at = now()
  where id = uid
  returning password_locked_at into locked;

  return jsonb_build_object('ok', true, 'already', false, 'lockedAt', locked);
end
$fn$;

grant execute on function public.lock_account_password() to authenticated;
