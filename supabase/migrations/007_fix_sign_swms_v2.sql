-- ============================================================================
-- FIX sign_swms_v2 (2026-07-25)
--
-- The function shipped in 006 took a parameter named `template_id`, which is
-- also a column on swms_signatures. Postgres could not tell them apart inside
-- the INSERT and the ON CONFLICT clause, so every call failed with
--   "column reference \"template_id\" is ambiguous"
-- and no signature was ever written. Caught by probing the live function
-- rather than reading it.
--
-- Every parameter is now p_-prefixed, which is the convention the rest of the
-- schema already follows (record_fitness_declaration, pilot_save_profile).
-- Safe to re-run.
-- ============================================================================

drop function if exists public.sign_swms_v2(bigint, text, bigint);

create or replace function public.sign_swms_v2(
  p_template_id bigint,
  p_signed_name text,
  p_worker_id bigint default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  t record;
  v_worker_id bigint;
  v_staff boolean;
  v_name text;
  v_version text;
  v_inserted bigint;
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

  return json_build_object(
    'recorded', v_inserted is not null,
    'signedName', v_name,
    'version', v_version,
    'alreadySigned', v_inserted is null
  );
end $fn$;
grant execute on function public.sign_swms_v2(bigint, text, bigint) to authenticated;

select
  (select count(*) from pg_proc where proname = 'sign_swms_v2') as fn_present;
