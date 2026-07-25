# Permission Matrix — OHS Builder Victoria

**Enforced by:** `supabase/migrations/009_database_enforced_rbac.sql` (PostgreSQL
row-level security), applied to production 2026-07-26.
**Verified by:** `matrix.local.mjs` (35 live checks) and `rbac.local.mjs`
(28 bypass attempts) — both signing in as real accounts and going through
PostgREST, the same door the browser uses.

Access is decided inside the database, not in the browser. Hiding a menu item
stops nobody who can type a URL or call the API directly, so nothing here
depends on the app behaving itself. The sidebar is now drawn from
`public.my_permissions()`, which is computed by the same predicates the
policies use — the menu cannot claim an access level the database will refuse.

---

## The four roles

| Role | Who they are | The line |
|---|---|---|
| **Builder Admin** | The subscriber — the person whose name is on the account | Everything in their own company |
| **HSE Manager** | Safety manager / consultant | All safety records org-wide; no billing, no ownership, no user administration |
| **Site Supervisor** | Runs one or more sites | Only the sites they are assigned to |
| **Worker / Tradie** | On the tools | Themselves, their own training, and incidents they reported or were involved in |

**Deliberate choice:** for a Site Supervisor, `profiles.project_ids = NULL`
means **no** projects, not all of them. Least privilege has to fail closed, so
a supervisor with nothing assigned sees nothing until someone assigns them.

---

## The matrix

C = Create · R = Read · U = Update · D = Delete · — = refused by the database (`42501`)

| Resource | Builder Admin | HSE Manager | Site Supervisor | Worker / Tradie |
|---|---|---|---|---|
| Organisation & branding | **R U** — own company | **R** | **R** | **R** |
| Billing & subscription | **R U** — account owner | — | — | — |
| User accounts | **C R U D** — whole roster | **R** — roster, read-only | **R U** — own account | **R U** — own account |
| Roles & site assignment | **U** — audited RPC | — | — | — |
| Invitations | **C R U D** | — | — | — |
| Projects | **C R U D** — all sites | **R** — all sites | **R** — assigned sites | **R** — their own site |
| Crew records | **C R U D** — whole crew | **C R U D** — whole crew | **R** — crew on assigned sites | **R** — own record only |
| SWMS documents | **C R U D** — all trades | **C R U D** — all trades | **R** — all trades | **R** — their trade only |
| SWMS signatures | **C R** — never editable | **C R** — never editable | **R** — crew on assigned sites | **C R** — own signature only |
| Incidents | **C R U D** — all sites | **C R U** — no delete | **C R U** — assigned sites | **C R** — reported by or involving them |
| Corrective actions | **C R U D** | **C R U D** | **C R U D** — assigned sites | **R** — on their own incidents |
| Site diary | **C R U D** — all sites | **C R U D** — all sites | **C R U D** — assigned sites | — |
| Toolbox meetings | **C R U D** — all sites | **C R U D** — all sites | **C R U D** — assigned sites | — |
| Policy register | **C R U D** | **C R U D** | **R** | **R** |
| Compliance documents | **C R U D** — whole crew | **C R U D** — whole crew | **R** — crew on assigned sites | **C R U D** — own documents only |
| Subcontractor companies | **C R U D** | **C R U D** | **R** | **R** — their own company |
| Project documents | **C R U D** — all sites | **R** — all sites | **C R U D** — assigned sites | — |
| Site check-ins | **R** — all sites | **R** — all sites | **R** — assigned sites | **R** — own check-ins |
| Quiz attempts | **R** — whole crew | **R** — whole crew | **R** — crew on assigned sites | **R** — own attempts |
| Photos on records | **C R D** | **C R D** | **C R** | **C R** — their own incidents |
| Security audit log | **R** — append-only | **R** — append-only | — | — |

The same table is shown in-app under **Admin Portal → Role Permission Matrix**,
transcribed in `src/data/constants.js`. It is documentation of the policies, not
a switchboard: editing it changes what the screen says and nothing else.

---

## Things worth spelling out

**A tradie cannot browse colleagues' records.** Incident visibility is decided
by `can_read_incident()` against two real columns, `reported_by_worker_id` and
`involved_worker_id`, stamped on insert by a trigger so the app cannot forget
to. Free-text "reported by" is not trusted for access decisions. Existing rows
were backfilled only where the name matched exactly one person in the company —
an ambiguous match was left null, because a guess there hands someone another
person's injury record.

**The site diary and project documents are the builder's records.** A tradie has
no access at all, on any site.

**Competency evidence cannot be edited.** SWMS signatures and quiz attempts have
insert and select policies only. With no update or delete policy, nobody — not
even the Builder — can quietly alter what someone signed or scored. The quiz is
graded server-side by `submit_quiz()`; `update_my_compliance()` explicitly
refuses `quiz`, so no one can self-certify.

**Privileged changes go through audited RPCs.** `set_user_role()` and
`set_user_projects()` are Builder-only, and every call is written to
`security_audit` with the actor, their role and the before/after values.
Fifteen sensitive tables carry the same audit trigger. `security_audit` has a
select policy and no insert, update or delete policy for users — rows arrive
only from `SECURITY DEFINER` triggers and cannot be edited or removed.

**Columns RLS cannot reach are locked by GRANTs.** Row-level security is
all-or-nothing per row, so column-level grants (migration 004) stop a user
writing `role`, `organization_id`, `project_ids` or `worker_id` on their own
profile row even though the row itself is theirs to update.

---

## Verification

These scripts sign in as real QA accounts, so they hold passwords and stay off
the repository (`*.local.mjs` is git-ignored). They live in the project root on
the development machine:

```
node rbac.local.mjs      # 28 bypass attempts across the four roles
node matrix.local.mjs    # 35 checks that this table is accurate
node navcheck.local.mjs  # the menu each role is actually served
```

Result on 2026-07-26: **28/28** bypass attempts refused, **35/35** matrix checks
correct. Menu served per role:

| Role | Sidebar |
|---|---|
| Builder Admin | all 11 items |
| HSE Manager | 9 — no Projects, no Admin Portal |
| Site Supervisor | 5 — Dashboard, Site Diary, Incidents, Toolbox, Welcome |
| Worker / Tradie | redirected to the stakeholder app |

Representative refusals, taken from the live run:

- HSE Manager creating a project → refused
- HSE Manager renaming the organisation → 0 rows
- HSE Manager promoting itself to Builder → RPC raises
- Supervisor writing a diary entry on an unassigned site → refused
- Supervisor assigning itself extra sites → RPC raises
- Tradie reading the site diary, toolbox meetings or project documents → 0 rows
- Tradie reading colleagues' incidents → sees 1 of 3 in the company (their own)
- Tradie filing a certificate against another worker → refused
- Tradie setting their own quiz result to Verified → refused
