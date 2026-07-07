-- Profile editing:
-- 1. Broaden the UPDATE policies so admins can edit any profile in their scope.
-- 2. Keep the self-update policy but block role changes via a BEFORE UPDATE
--    trigger so users can never elevate or demote themselves — the trigger
--    guards the invariant even if a client bypasses the UI.

-- Existing 0002 policy allowed id = auth.uid() only, no admin path.
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_system_admin on public.profiles;
drop policy if exists profiles_update_company_admin on public.profiles;

create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_system_admin on public.profiles
  for update
  using (public.current_user_role() = 'system_admin')
  with check (public.current_user_role() = 'system_admin');

create policy profiles_update_company_admin on public.profiles
  for update
  using (
    public.current_user_role() = 'company_admin'
    and company_id = public.current_user_company()
  )
  with check (
    public.current_user_role() = 'company_admin'
    and company_id = public.current_user_company()
  );

-- Trigger blocks any role change performed by the row's owner themselves.
-- Service-role writes (auth.uid() is null) pass through unaffected.
create or replace function public.enforce_profile_role_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid;
  caller_role text;
begin
  if new.role is distinct from old.role then
    caller := auth.uid();
    if caller is null then
      return new; -- service role or seed
    end if;
    if caller = old.id then
      raise exception 'Cannot change your own role'
        using errcode = 'insufficient_privilege';
    end if;
    caller_role := public.current_user_role();
    if caller_role not in ('system_admin', 'company_admin') then
      raise exception 'Only admins can change roles'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_edit_guard on public.profiles;
create trigger profiles_role_edit_guard
  before update of role on public.profiles
  for each row
  execute function public.enforce_profile_role_edit();
