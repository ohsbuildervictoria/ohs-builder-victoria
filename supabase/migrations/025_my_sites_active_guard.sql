-- 025 — my_sites()/switch_my_site() must treat a deactivated account as nobody,
-- like every other predicate (is_active_account). Found during the access-reset
-- proof: a banned stakeholder's still-unexpired JWT could list its own sites.
create or replace function public.my_sites()
returns json language sql stable security definer set search_path = public as $$
  select case when not public.is_active_account() then '[]'::json else coalesce(json_agg(json_build_object(
    'workerId', w.id,
    'current', w.id = (select worker_id from public.profiles where id = auth.uid()),
    'organizationId', w.organization_id, 'builderName', o.name,
    'projectId', w.project_id, 'projectName', p.name, 'projectAddress', p.address,
    'trades', coalesce(w.trades, '{}'),
    'induction', w.induction, 'quiz', w.quiz, 'swms', w.swms,
    'whiteCard', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'white_card' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date)) then 'Verified' else w.white_card end,
    'insurance', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'insurance' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date))
                        or exists (select 1 from public.company_documents cd where cd.company_id = w.company_id and cd.category = 'public_liability' and (cd.expiry_date is null or cd.expiry_date >= current_date)) then 'Verified' else w.insurance end,
    'medical', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'medical' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date)) then 'Verified' else w.medical end,
    'status', w.status,
    'swmsPending', (select count(*) from public.swms_templates t
                     where t.organization_id = w.organization_id and t.trade = any(w.trades)
                       and not exists (select 1 from public.swms_signatures g where g.template_id = t.id and g.worker_id = w.id and g.template_version = coalesce(t.version,'')))
  ) order by (w.id = (select worker_id from public.profiles where id = auth.uid())) desc, p.name), '[]'::json) end
  from public.workers w
  left join public.organizations o on o.id = w.organization_id
  left join public.projects p on p.id = w.project_id
  where w.user_id = auth.uid() and w.account_status = 'active'
$$;

create or replace function public.switch_my_site(p_worker bigint)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'not authenticated'; end if;
  select * into w from public.workers where id = p_worker and user_id = auth.uid() and account_status = 'active';
  if not found then raise exception 'That site is not available to you.'; end if;
  if (select role from public.profiles where id = auth.uid()) <> 'worker' then
    raise exception 'Only stakeholder accounts switch sites.';
  end if;
  update public.profiles set organization_id = w.organization_id, worker_id = w.id where id = auth.uid();
  return json_build_object('workerId', w.id, 'organizationId', w.organization_id, 'projectId', w.project_id);
end $$;
