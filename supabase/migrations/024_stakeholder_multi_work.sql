-- ============================================================================
-- 024 — Stakeholders: one person, many sites, many work types
--
-- Before this migration a `workers` row meant "one person on one project doing
-- one trade", and a person's account pointed at exactly one such row
-- (profiles.worker_id). That made a chippy who also does cladding, or a sparky
-- on two of the builder's sites, into either a second account or an overwritten
-- record.
--
-- After this migration:
--   * a `workers` row is a PROJECT MEMBERSHIP for a person (unchanged shape, so
--     every existing policy, RPC and report keeps working);
--   * `workers.trades text[]` holds every work type on that membership.
--     `workers.trade` stays as the first/primary work type for legacy readers
--     and is kept in sync by trigger — nothing old breaks;
--   * `workers.user_id` links every membership a person has claimed to the ONE
--     auth account; `profiles.worker_id` is simply the site they are looking at
--     right now. `my_sites()` lists them, `switch_my_site()` moves between
--     them. Records never mix: every worker-scoped table is still keyed by the
--     membership (worker_id) it was created under;
--   * a SWMS applies to a person when its trade is ANY of their work types on
--     that site (`swms read` policy, `revise_swms`, staff paper sign-off);
--   * the SWMS tick means "every applicable SWMS, at its current version, is
--     signed" — not "signed one of them" (`recompute_worker_swms`);
--   * `set_worker_trades()` is the one server-side place that changes work
--     types: it provisions a SWMS template per trade, recomputes template
--     totals from the crew (fixing the client-side drift), re-evaluates the
--     tick and audits the change. Existing signatures are never touched.
--
-- Induction is deliberately unchanged: it is per membership (per site), so a
-- new work type on the same site does NOT repeat the induction, and a new site
-- does require that site's induction.
--
-- Education (021–023) is untouched.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns + backfill
-- ---------------------------------------------------------------------------
alter table public.workers add column if not exists trades text[] not null default '{}';
alter table public.workers add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists workers_user_id_idx on public.workers (user_id);
create index if not exists workers_trades_idx on public.workers using gin (trades);

update public.workers set trades = array[trade]
 where cardinality(trades) = 0 and coalesce(trim(trade), '') <> '';

update public.workers w set user_id = p.id
  from public.profiles p
 where p.worker_id = w.id and w.user_id is null and p.role = 'worker';

-- Keep `trade` (legacy, singular) and `trades` (canonical) consistent.
create or replace function public.workers_sync_trades()
returns trigger language plpgsql as $$
begin
  new.trades := coalesce(
    (select array_agg(distinct t order by t) from unnest(new.trades) t where coalesce(trim(t), '') <> ''), '{}');
  if cardinality(new.trades) = 0 and coalesce(trim(new.trade), '') <> '' then
    new.trades := array[trim(new.trade)];
  end if;
  if cardinality(new.trades) > 0 and (new.trade is distinct from new.trades[1]) then
    -- If the legacy column is still one of the work types keep it as primary;
    -- otherwise the first work type becomes the primary.
    if not (coalesce(new.trade, '') = any(new.trades)) then
      new.trade := new.trades[1];
    end if;
  end if;
  return new;
end $$;

drop trigger if exists workers_sync_trades on public.workers;
create trigger workers_sync_trades before insert or update of trade, trades on public.workers
  for each row execute function public.workers_sync_trades();

-- Column-level grants on workers were set in earlier migrations per role; the
-- new columns inherit the table grant for staff (builder/hse manage rows) and
-- are read-only for workers via the existing "workers read" policy.

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.my_worker_trades()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select trades from public.workers where id = public.my_worker_id()), '{}')
$$;

-- The SWMS tick = every applicable template (current version) signed by this
-- membership. Missing = nothing signed yet; Pending = some but not all.
create or replace function public.recompute_worker_swms(p_worker bigint)
returns text language plpgsql security definer set search_path = public as $$
declare w record; v_total int; v_signed int; v_new text;
begin
  select * into w from public.workers where id = p_worker;
  if not found then return null; end if;
  select count(*),
         count(*) filter (where exists (
           select 1 from public.swms_signatures g
            where g.template_id = t.id and g.worker_id = w.id
              and g.template_version = coalesce(t.version, '')))
    into v_total, v_signed
    from public.swms_templates t
   where t.organization_id = w.organization_id and t.trade = any(w.trades);
  v_new := case when v_total > 0 and v_signed = v_total then 'Verified'
                when v_signed > 0 then 'Pending'
                when w.swms = 'Verified' and v_total = 0 then 'Verified'  -- no template to sign: leave a recorded tick alone
                else 'Missing' end;
  update public.workers w2 set swms = v_new where w2.id = w.id and w2.swms is distinct from v_new;
  update public.workers w2 set status =
    case
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w2.id = w.id;
  return v_new;
end $$;
revoke all on function public.recompute_worker_swms(bigint) from public, anon, authenticated;

-- Template totals derive from the crew: how many memberships in the org list
-- this trade among their work types.
create or replace function public.recompute_swms_totals(p_org bigint)
returns void language sql security definer set search_path = public as $$
  update public.swms_templates t
     set total = (select count(*) from public.workers w where w.organization_id = t.organization_id and t.trade = any(w.trades)),
         signed = least((select count(*) from public.swms_signatures g where g.template_id = t.id and g.template_version = coalesce(t.version,'')),
                        greatest((select count(*) from public.workers w where w.organization_id = t.organization_id and t.trade = any(w.trades)), 0))
   where t.organization_id = p_org
$$;
revoke all on function public.recompute_swms_totals(bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. SWMS applicability by ANY work type
-- ---------------------------------------------------------------------------
drop policy if exists "swms read" on public.swms_templates;
create policy "swms read" on public.swms_templates for select to authenticated
  using (organization_id = public.my_org()
         and (public.is_org_safety() or public.is_supervisor()
              or trade = any(public.my_worker_trades())));

-- Signing: the tick follows ALL applicable signatures, not the first one.
create or replace function public.sign_swms_v2(p_template_id bigint, p_signed_name text, p_worker_id bigint default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  t record; v_worker_id bigint; v_staff boolean; v_name text;
  v_version text; v_inserted bigint; v_tick text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into t from public.swms_templates
    where id = p_template_id and organization_id = public.my_org();
  if t.id is null then raise exception 'That SWMS is not available.'; end if;
  if t.locked then raise exception 'That SWMS is locked and cannot be signed.'; end if;

  v_staff := public.is_builder_staff();
  v_worker_id := coalesce(public.my_worker_id(), case when v_staff then p_worker_id else null end);

  if v_worker_id is not null then
    perform 1 from public.workers
      where id = v_worker_id and organization_id = public.my_org();
    if not found then raise exception 'That worker is not in your organisation.'; end if;
  elsif not v_staff then
    raise exception 'no linked worker record';
  end if;

  select name into v_name from public.workers where id = v_worker_id;
  v_name := coalesce(nullif(trim(p_signed_name), ''), v_name, 'Unnamed');
  v_version := coalesce(t.version, '');

  insert into public.swms_signatures as sig
    (organization_id, template_id, worker_id, signed_name, template_version, signed_by_staff)
  values
    (t.organization_id, t.id, v_worker_id, v_name, v_version,
     v_staff and public.my_worker_id() is null)
  on conflict (template_id, worker_id, template_version) do nothing
  returning sig.id into v_inserted;

  update public.swms_templates s
     set signed = least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id
               and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
   where s.id = t.id;

  if v_worker_id is not null then
    v_tick := public.recompute_worker_swms(v_worker_id);
  end if;

  return json_build_object(
    'recorded', v_inserted is not null,
    'signedName', v_name,
    'version', v_version,
    'alreadySigned', v_inserted is null,
    'swmsStatus', v_tick
  );
end $$;

-- Revision: ask everyone whose work types include this trade to sign again.
create or replace function public.revise_swms(p_template_id bigint, p_new_version text, p_reason text)
returns json language plpgsql security definer set search_path = public as $$
declare
  t record; v_actor text; v_new text; v_invalidated int; v_reset int := 0; r record;
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
  if v_new is null then raise exception 'Give the new version a name.'; end if;
  if v_new = coalesce(t.version, '') then
    raise exception 'The new version has to differ from the current one (%).', t.version;
  end if;
  if exists (select 1 from public.swms_revisions r2 where r2.template_id = t.id and r2.to_version = v_new) then
    raise exception 'Version % has already been used for this SWMS.', v_new;
  end if;

  select name into v_actor from public.profiles where id = auth.uid();

  select count(*) into v_invalidated
    from public.swms_signatures g
   where g.template_id = t.id and g.template_version = coalesce(t.version, '');

  update public.swms_templates
     set version = v_new, signed = 0, locked = false, status = 'Pending Compliance'
   where id = t.id;

  for r in select w.id, w.swms from public.workers w
            where w.organization_id = t.organization_id and t.trade = any(w.trades) loop
    if public.recompute_worker_swms(r.id) <> 'Verified' and r.swms = 'Verified' then
      v_reset := v_reset + 1;
    end if;
  end loop;

  insert into public.swms_revisions
    (organization_id, template_id, from_version, to_version, reason, revised_by, revised_by_name, signatures_invalidated)
  values (t.organization_id, t.id, t.version, v_new, trim(p_reason), auth.uid(), v_actor, v_invalidated);

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (t.organization_id, auth.uid(), public.my_role(), v_actor,
          'SWMS_REVISED', 'swms_templates', t.id::text,
          jsonb_build_object('trade', t.trade, 'from', t.version, 'to', v_new, 'reason', trim(p_reason),
                             'signaturesInvalidated', v_invalidated, 'workersAskedToResign', v_reset));

  return json_build_object('trade', t.trade, 'fromVersion', t.version, 'toVersion', v_new,
                           'signaturesInvalidated', v_invalidated, 'workersAskedToResign', v_reset);
end $$;

-- Staff paper sign-off for SWMS: record a signature for EVERY applicable
-- template that is not yet signed at its current version, then re-evaluate.
create or replace function public.record_compliance_signoff(p_worker_id bigint, p_category text, p_value text default 'Verified', p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  w record; t record; v_actor text; v_recorded boolean := false; v_any boolean := false;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can record a sign-off.';
  end if;
  if p_category = 'quiz' then
    raise exception 'The safety quiz is graded when it is sat — it cannot be recorded by hand.';
  end if;
  if p_category not in ('induction','swms') then raise exception 'category not allowed'; end if;
  if p_value not in ('Verified','Pending','Missing') then raise exception 'value not allowed'; end if;

  select * into w from public.workers where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  select name into v_actor from public.profiles where id = auth.uid();

  if p_value = 'Verified' then
    if p_category = 'induction' then
      insert into public.induction_completions
        (organization_id, worker_id, project_id, recorded_by, recorded_by_name, on_paper, note)
      values (w.organization_id, w.id, w.project_id, auth.uid(), v_actor, true, p_note);
      v_recorded := true;
    else
      for t in select * from public.swms_templates
                where organization_id = w.organization_id and trade = any(w.trades) order by id loop
        v_any := true;
        insert into public.swms_signatures as sig
          (organization_id, template_id, worker_id, signed_name, template_version, signed_by_staff)
        values (w.organization_id, t.id, w.id, w.name, coalesce(t.version,''), true)
        on conflict (template_id, worker_id, template_version) do nothing;
        update public.swms_templates s
           set signed = least((select count(*) from public.swms_signatures g
                                where g.template_id = s.id and g.template_version = coalesce(s.version,'')),
                              greatest(s.total, 0))
         where s.id = t.id;
        v_recorded := true;
      end loop;
      if not v_any then
        raise exception 'There is no SWMS published for % work yet — add it before recording a sign-off.',
          coalesce(array_to_string(w.trades, ', '), 'that');
      end if;
    end if;
  end if;

  if p_category = 'swms' then
    if p_value = 'Verified' then
      perform public.recompute_worker_swms(w.id);
    else
      update public.workers set swms = p_value where id = w.id;
    end if;
  else
    update public.workers set induction = p_value where id = w.id;
  end if;

  update public.workers w2 set status =
    case
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w2.id = w.id;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (w.organization_id, auth.uid(), public.my_role(), v_actor,
          'COMPLIANCE_SIGNOFF', 'workers', w.id::text,
          jsonb_build_object('category', p_category, 'value', p_value, 'evidenceWritten', v_recorded, 'note', p_note));

  return json_build_object('category', p_category, 'value', p_value, 'evidenceWritten', v_recorded);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Work types are changed in one place, server-side
-- ---------------------------------------------------------------------------
create or replace function public.set_worker_trades(p_worker bigint, p_trades text[])
returns json language plpgsql security definer set search_path = public as $$
declare w record; v_trades text[]; t text; v_actor text; v_before text[]; v_tick text;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can change work types.';
  end if;
  select * into w from public.workers where id = p_worker and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  select coalesce(array_agg(distinct x order by x), '{}') into v_trades
    from (select trim(u) x from unnest(coalesce(p_trades, '{}')) u) s where x <> '';
  if cardinality(v_trades) = 0 then raise exception 'Choose at least one work type.'; end if;

  v_before := w.trades;
  update public.workers set trades = v_trades where id = w.id;

  -- One SWMS template per work type, created on demand (same ref/version
  -- convention the app used client-side).
  foreach t in array v_trades loop
    if not exists (select 1 from public.swms_templates s where s.organization_id = w.organization_id and s.trade = t) then
      insert into public.swms_templates (organization_id, trade, ref, version, signed, total, status)
      values (w.organization_id, t,
              'SWMS-' || upper(left(regexp_replace(t, '[^A-Za-z0-9]', '', 'g'), 3)) || '-' || w.organization_id::text || '-' || left(md5(lower(t)), 6),
              'v1.0', 0, 0, 'Pending Compliance');
    end if;
  end loop;
  perform public.recompute_swms_totals(w.organization_id);
  v_tick := public.recompute_worker_swms(w.id);

  select name into v_actor from public.profiles where id = auth.uid();
  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (w.organization_id, auth.uid(), public.my_role(), v_actor, 'WORK_TYPES_CHANGED', 'workers', w.id::text,
          jsonb_build_object('from', v_before, 'to', v_trades, 'swmsStatus', v_tick));

  return json_build_object('workerId', w.id, 'trades', v_trades, 'swmsStatus', v_tick);
end $$;
grant execute on function public.set_worker_trades(bigint, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. One person, many sites
-- ---------------------------------------------------------------------------
-- Accepting an invite links the membership to the account. A worker account
-- that was invited BY EMAIL may hold memberships with more than one builder;
-- the site it is looking at (profiles.worker_id/organization_id) switches to
-- the one just accepted. Staff accounts are never moved between companies.
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
  if existing_org is not null and existing_org <> w.organization_id then
    if coalesce(existing_role, 'worker') <> 'worker' or not v_matched then
      raise exception 'Your account already belongs to another company. Ask your administrator to resolve this — accounts are not moved between companies by invite link.';
    end if;
    -- A stakeholder invited by email by a second builder: add the membership,
    -- keep the old one; the person can switch between sites.
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

create or replace function public.worker_invite_info(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'workerName', w.name, 'trade', w.trade, 'trades', coalesce(w.trades, '{}'), 'orgName', o.name,
    'projectName', p.name, 'projectAddress', p.address, 'claimed', (w.account_status = 'active'),
    'email', nullif(w.email, '')
  )
  from public.workers w
  left join public.organizations o on o.id = w.organization_id
  left join public.projects p on p.id = w.project_id
  where w.invite_token = token
$$;

-- Every site this account holds a membership on, with a readiness summary.
create or replace function public.my_sites()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'workerId', w.id,
    'current', w.id = (select worker_id from public.profiles where id = auth.uid()),
    'organizationId', w.organization_id, 'builderName', o.name,
    'projectId', w.project_id, 'projectName', p.name, 'projectAddress', p.address,
    'trades', coalesce(w.trades, '{}'),
    'induction', w.induction, 'quiz', w.quiz, 'swms', w.swms,
    -- Document categories follow the evidence, as the app's compliance.js does:
    -- a current, unexpired document (or the employer's public-liability
    -- certificate for insurance) counts as Verified.
    'whiteCard', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'white_card' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date)) then 'Verified' else w.white_card end,
    'insurance', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'insurance' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date))
                        or exists (select 1 from public.company_documents cd where cd.company_id = w.company_id and cd.category = 'public_liability' and (cd.expiry_date is null or cd.expiry_date >= current_date)) then 'Verified' else w.insurance end,
    'medical', case when exists (select 1 from public.compliance_documents d where d.worker_id = w.id and d.category = 'medical' and d.superseded_at is null and (d.expiry_date is null or d.expiry_date >= current_date)) then 'Verified' else w.medical end,
    'status', w.status,
    'swmsPending', (select count(*) from public.swms_templates t
                     where t.organization_id = w.organization_id and t.trade = any(w.trades)
                       and not exists (select 1 from public.swms_signatures g where g.template_id = t.id and g.worker_id = w.id and g.template_version = coalesce(t.version,'')))
  ) order by (w.id = (select worker_id from public.profiles where id = auth.uid())) desc, p.name), '[]'::json)
  from public.workers w
  left join public.organizations o on o.id = w.organization_id
  left join public.projects p on p.id = w.project_id
  where w.user_id = auth.uid() and w.account_status = 'active'
$$;
grant execute on function public.my_sites() to authenticated;

create or replace function public.switch_my_site(p_worker bigint)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into w from public.workers where id = p_worker and user_id = auth.uid() and account_status = 'active';
  if not found then raise exception 'That site is not available to you.'; end if;
  if (select role from public.profiles where id = auth.uid()) <> 'worker' then
    raise exception 'Only stakeholder accounts switch sites.';
  end if;
  update public.profiles set organization_id = w.organization_id, worker_id = w.id where id = auth.uid();
  return json_build_object('workerId', w.id, 'organizationId', w.organization_id, 'projectId', w.project_id);
end $$;
grant execute on function public.switch_my_site(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Totals: one-off reconciliation of template totals from the crew
-- ---------------------------------------------------------------------------
do $$ declare o record; begin
  for o in select distinct organization_id from public.swms_templates loop
    perform public.recompute_swms_totals(o.organization_id);
  end loop;
end $$;
