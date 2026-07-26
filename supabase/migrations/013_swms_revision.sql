-- ============================================================================
-- REVISING A SWMS, AND MAKING EVERYONE SIGN THE NEW ONE (2026-07-26)
--
-- swms_templates.version was written once as 'v1.0' when a trade first
-- appeared and was never changed by anything in the product. Regulation 325
-- of the OHS Regulations 2017 requires a SWMS to be reviewed and revised when
-- the work changes, when a control is altered, or when it turns out the
-- controls are not working — which is precisely the moment after an incident.
--
-- The data model already supported it: swms_signatures carries the version it
-- was signed against, so a revision correctly invalidates the old signatures
-- instead of overwriting them. What was missing was any way to do it, so in
-- practice a builder revising a SWMS on paper had a system still showing the
-- old one as signed off.
--
-- The important part is what happens to the crew. Revising is not an edit —
-- it means the document people agreed to is no longer the document in force,
-- so their sign-off goes back to Pending and they are asked again. Silently
-- carrying the old ticks forward would be the most dangerous option: it would
-- show a fully signed-off SWMS that nobody on site has actually read.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Why each version exists. Insert-only: a revision history that can be edited
-- is not a revision history.
-- ---------------------------------------------------------------------------
create table if not exists public.swms_revisions (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id),
  template_id bigint not null references public.swms_templates(id) on delete restrict,
  from_version text,
  to_version text not null,
  reason text not null,
  revised_by uuid references public.profiles(id),
  revised_by_name text,
  signatures_invalidated int not null default 0,
  revised_at timestamptz not null default now()
);
alter table public.swms_revisions enable row level security;

drop policy if exists "swms revisions: read" on public.swms_revisions;
create policy "swms revisions: read" on public.swms_revisions
  for select to authenticated
  using (organization_id = public.my_org());
-- Everyone in the company may read why a SWMS changed — a tradie being asked
-- to sign again is entitled to know what moved. No write policy: rows arrive
-- only through revise_swms().

-- ---------------------------------------------------------------------------
-- Revise. Builder and HSE only — this invalidates other people's sign-offs.
-- ---------------------------------------------------------------------------
create or replace function public.revise_swms(
  p_template_id bigint,
  p_new_version text,
  p_reason text
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  t record; v_actor text; v_new text; v_invalidated int; v_reset int;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can revise a SWMS.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Give a reason for the revision — it is the record of why the controls changed.';
  end if;

  select * into t from public.swms_templates
    where id = p_template_id and organization_id = public.my_org();
  if not found then raise exception 'That SWMS is not available.'; end if;

  v_new := nullif(trim(p_new_version), '');
  if v_new is null then
    raise exception 'Give the new version a name.';
  end if;
  if v_new = coalesce(t.version, '') then
    raise exception 'The new version has to differ from the current one (%).', t.version;
  end if;
  if exists (select 1 from public.swms_revisions r
              where r.template_id = t.id and r.to_version = v_new) then
    raise exception 'Version % has already been used for this SWMS.', v_new;
  end if;

  select name into v_actor from public.profiles where id = auth.uid();

  -- Signatures are never deleted. They stay against the version they were
  -- given for, and simply stop counting towards the current one.
  select count(*) into v_invalidated
    from public.swms_signatures g
   where g.template_id = t.id and g.template_version = coalesce(t.version, '');

  update public.swms_templates
     set version = v_new,
         signed = 0,
         locked = false,          -- a new version has to be signable again
         status = 'Pending Compliance'
   where id = t.id;

  -- Everyone whose sign-off rested on the old version is asked again.
  with affected as (
    update public.workers w
       set swms = 'Pending'
     where w.organization_id = t.organization_id
       and w.trade = t.trade
       and w.swms = 'Verified'
       and not exists (
         select 1 from public.swms_signatures g
          where g.worker_id = w.id and g.template_id = t.id
            and g.template_version = v_new)
    returning w.id
  )
  select count(*) into v_reset from affected;

  update public.workers w set status =
    case
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w.organization_id = t.organization_id and w.trade = t.trade;

  insert into public.swms_revisions
    (organization_id, template_id, from_version, to_version, reason,
     revised_by, revised_by_name, signatures_invalidated)
  values (t.organization_id, t.id, t.version, v_new, trim(p_reason),
          auth.uid(), v_actor, v_invalidated);

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (t.organization_id, auth.uid(), public.my_role(), v_actor,
          'SWMS_REVISED', 'swms_templates', t.id::text,
          jsonb_build_object('trade', t.trade, 'from', t.version, 'to', v_new,
                             'reason', trim(p_reason),
                             'signaturesInvalidated', v_invalidated,
                             'workersAskedToResign', v_reset));

  return json_build_object(
    'trade', t.trade,
    'fromVersion', t.version,
    'toVersion', v_new,
    'signaturesInvalidated', v_invalidated,
    'workersAskedToResign', v_reset
  );
end $fn$;
grant execute on function public.revise_swms(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_proc where proname = 'revise_swms')          as revise_fn,
  (select count(*) from pg_tables where tablename = 'swms_revisions')   as revisions_table,
  (select count(*) from pg_policies
     where tablename = 'swms_revisions' and cmd <> 'SELECT')            as write_policies;
