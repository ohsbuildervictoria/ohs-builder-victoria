-- ============================================================================
-- STAFF INVITES BECOME REAL (2026-07-17)
-- The Admin Portal's "Invite Stakeholder" used to only record a row in
-- public.invites — no account, no link, no email — so invited staff sat on
-- "Invited" forever (this is exactly what stranded the two builder-admin
-- invites in production). Staff invites now work like tradie invites:
-- a one-time token, a public preview, an accept RPC, and a server-side
-- email endpoint (/api/send-staff-invite).
-- ============================================================================

alter table public.invites add column if not exists invite_token uuid default gen_random_uuid();
alter table public.invites add column if not exists status text not null default 'invited';
alter table public.invites add column if not exists accepted_at timestamptz;
alter table public.invites drop constraint if exists invites_status_check;
alter table public.invites add constraint invites_status_check
  check (status in ('invited','accepted'));

-- Rows recorded before this migration get a token so their links work.
update public.invites set invite_token = gen_random_uuid()
  where invite_token is null and status = 'invited';

-- Public invite preview (anon): what invited staff see before setting a
-- password. Same shape of exposure as worker_invite_info — only reachable
-- with the unguessable token from the invite link itself.
create or replace function public.staff_invite_info(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', i.name, 'email', i.email, 'role', i.role,
    'orgName', o.name, 'claimed', (i.status = 'accepted')
  )
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.invite_token = token
$$;
grant execute on function public.staff_invite_info(uuid) to anon, authenticated;

-- Claim a staff invite: attach the signed-in account to the inviting org with
-- the invited role. Three guards make this safe:
--   1. The caller's auth email must equal the invite's email — holding the
--      link is not enough to take a role that was issued to someone else.
--   2. An account that already belongs to a DIFFERENT org is refused, not
--      silently moved — switching companies strands that org's data and must
--      be a deliberate administrative act, not a link click.
--   3. The token is single-use (cleared on accept).
create or replace function public.accept_staff_invite(token uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare i record; my_email text; existing_org bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into i from public.invites where invite_token = token and status = 'invited';
  if i.id is null then
    raise exception 'This invite link is invalid or has already been used.';
  end if;
  select email into my_email from auth.users where id = auth.uid();
  if lower(trim(my_email)) <> lower(trim(i.email)) then
    raise exception 'This invite was issued to % — sign in with that email address.', i.email;
  end if;
  select organization_id into existing_org from public.profiles where id = auth.uid();
  if existing_org is not null and existing_org <> i.organization_id then
    raise exception 'Your account already belongs to another company. Ask your administrator to resolve this — accounts are not moved between companies by invite link.';
  end if;
  update public.profiles
    set organization_id = i.organization_id,
        role = i.role,
        status = 'Active',
        name = coalesce(nullif(trim(i.name), ''), name)
    where id = auth.uid();
  update public.invites
    set status = 'accepted', accepted_at = now(), invite_token = null
    where id = i.id;
end $fn$;
grant execute on function public.accept_staff_invite(uuid) to authenticated;
