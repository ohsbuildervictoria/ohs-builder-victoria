-- ============================================================================
-- THE SIGN-OFF COUNT STOPS OUTRUNNING THE REGISTER (2026-07-26)
--
-- Surfacing the signature register immediately showed what it was hiding: the
-- Carpenter SWMS reported "1 of 1 signed" against zero signature rows. The
-- count came from the old path, where signing set a column and incremented a
-- number; the signature itself was never written (the ambiguous-parameter bug
-- fixed in 007 meant every call failed silently), and later a status could be
-- set by hand with no evidence at all.
--
-- So the product was showing a builder a green sign-off bar it could not
-- stand behind. That is the same defect as every other one this week, and it
-- gets the same treatment: the number becomes a consequence of the evidence.
--
--   * swms_templates.signed is recomputed from the register, and a trigger
--     keeps it that way no matter which path writes a signature.
--   * A worker whose SWMS says Verified with no signature anywhere is moved
--     back to Pending. This will look like a step backwards on the compliance
--     matrix, and it is the honest position: there is no record that person
--     ever signed. Where the sign-off really did happen on paper, recording it
--     through the Compliance screen now writes the signature it always should
--     have, and the tick returns with something behind it.
--   * Every such change is written to security_audit with its reason, so the
--     builder can see exactly what moved and why rather than finding ticks
--     quietly missing.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The count follows the register, always.
-- ---------------------------------------------------------------------------
create or replace function public.sync_swms_signed_count()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_template bigint;
begin
  v_template := coalesce(new.template_id, old.template_id);
  update public.swms_templates s
     set signed = least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id
               and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
   where s.id = v_template;
  return coalesce(new, old);
end $fn$;

drop trigger if exists swms_signatures_sync_count on public.swms_signatures;
create trigger swms_signatures_sync_count
  after insert or update or delete on public.swms_signatures
  for each row execute function public.sync_swms_signed_count();

-- A version bump changes which signatures count as current, so the number has
-- to be recomputed then too.
create or replace function public.sync_swms_count_on_version()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  new.signed := least(
    (select count(*) from public.swms_signatures g
      where g.template_id = new.id
        and g.template_version = coalesce(new.version, '')),
    greatest(new.total, 0));
  return new;
end $fn$;

drop trigger if exists swms_templates_sync_count on public.swms_templates;
create trigger swms_templates_sync_count
  before update of version, total on public.swms_templates
  for each row execute function public.sync_swms_count_on_version();

-- ---------------------------------------------------------------------------
-- 2. Reconcile what is already there.
-- ---------------------------------------------------------------------------
with corrected as (
  update public.swms_templates s
     set signed = least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id
               and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
   where s.signed is distinct from least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id
               and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
  returning s.id, s.organization_id, s.trade, s.signed
)
insert into public.security_audit
  (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
select organization_id, null, 'system', 'Reconciliation',
       'SWMS_COUNT_RECONCILED', 'swms_templates', id::text,
       jsonb_build_object('trade', trade, 'signedNow', signed,
                          'reason', 'Count recomputed from the signature register')
from corrected;

-- ---------------------------------------------------------------------------
-- 3. A tick with no signature behind it goes back to Pending, loudly.
-- ---------------------------------------------------------------------------
with unsupported as (
  update public.workers w
     set swms = 'Pending'
   where w.swms = 'Verified'
     and not exists (
       select 1 from public.swms_signatures g where g.worker_id = w.id)
  returning w.id, w.organization_id, w.name
)
insert into public.security_audit
  (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
select organization_id, null, 'system', 'Reconciliation',
       'COMPLIANCE_RECONCILED', 'workers', id::text,
       jsonb_build_object('worker', name, 'category', 'swms',
                          'from', 'Verified', 'to', 'Pending',
                          'reason', 'No SWMS signature exists for this person. If they signed on paper, record it on the Compliance screen and the signature will be written.')
from unsupported;

-- Overall status has to follow.
update public.workers w set status =
  case
    when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s = 'Missing') > 0
      then 'Site Access Pending'
    when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s <> 'Verified') > 0
      then 'Action Required'
    else 'Active'
  end;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.swms_templates s
    where s.signed <> least(
      (select count(*) from public.swms_signatures g
        where g.template_id = s.id and g.template_version = coalesce(s.version,'')),
      greatest(s.total,0)))                                        as counts_still_wrong,
  (select count(*) from public.workers w
    where w.swms = 'Verified'
      and not exists (select 1 from public.swms_signatures g where g.worker_id = w.id))
                                                                   as ticks_without_signatures,
  (select count(*) from public.security_audit
    where action in ('SWMS_COUNT_RECONCILED','COMPLIANCE_RECONCILED')) as reconciliation_entries;
