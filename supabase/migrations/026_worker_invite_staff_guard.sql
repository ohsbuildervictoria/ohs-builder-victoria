-- 026 — A stakeholder invite can only be accepted by a stakeholder account (or a
-- brand-new account created from the link). A signed-in builder / HSE manager /
-- site supervisor / institution admin / assessor / student must never be
-- converted into a worker by opening a link (seen in production 23 Aug: a
-- builder opened his own test stakeholder's link and his account became the
-- stakeholder). Everything else in accept_worker_invite is unchanged from 024.
create or replace function public.accept_worker_invite(token uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare w record; my_email text; existing_org bigint; existing_role text; v_matched boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into w from public.workers where invite_token = token;
  if w.id is null then
    raise exception 'This invite link is invalid or has already been used.';
  end if;

  select email into my_email from auth.users where id = auth.uid();
  v_matched := nullif(trim(coalesce(w.email, '')), '') is not null
               and lower(trim(my_email)) = lower(trim(w.email));
  if nullif(trim(coalesce(w.email, '')), '') is not null and not v_matched then
    raise exception 'This invite was issued to % — sign in with that email address.', w.email;
  end if;

  select organization_id, role into existing_org, existing_role from public.profiles where id = auth.uid();

  -- Staff and Education accounts are never turned into stakeholders.
  if coalesce(existing_role, 'worker') in ('institution_admin', 'assessor')
     or (coalesce(existing_role, 'worker') <> 'worker' and existing_org is not null) then
    raise exception 'You are signed in as a % account. A stakeholder invite is for the tradie''s own login — sign out (or open the link in a private window) and try again, or send the link to them.',
      case existing_role when 'builder_admin' then 'builder' when 'hse_manager' then 'HSE manager' when 'site_supervisor' then 'site supervisor' else replace(existing_role, '_', ' ') end;
  end if;

  if existing_org is not null and existing_org <> w.organization_id then
    if coalesce(existing_role, 'worker') <> 'worker' or not v_matched then
      raise exception 'Your account already belongs to another company. Ask your administrator to resolve this — accounts are not moved between companies by invite link.';
    end if;
  end if;

  update public.profiles
     set organization_id = w.organization_id, role = 'worker', worker_id = w.id, status = 'Active'
   where id = auth.uid();
  update public.workers
     set account_status = 'active', invite_token = null, user_id = auth.uid(),
         email = coalesce(nullif(email, ''), my_email)
   where id = w.id;
  return w.id;
end $$;
