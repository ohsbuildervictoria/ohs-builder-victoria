-- ============================================================================
-- Billing schema (feature/auth-billing branch)
-- ⚠️ NOT applied to the production database. Apply only when billing ships.
-- ============================================================================
create table public.subscriptions (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  price_id text not null default '',
  status text not null default 'incomplete',  -- Stripe status verbatim
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Everyone signed in can read the org's subscription state (single-tenant).
create policy "subscriptions read" on public.subscriptions
  for select to authenticated using (true);

-- Writes come only from the stripe-webhook edge function (service role) —
-- no client write policies on purpose.
