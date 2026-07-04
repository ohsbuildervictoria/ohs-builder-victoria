// ============================================================================
// Billing (feature/auth-billing branch — NOT live during the pilot)
//
// Stripe subscription gate for the builder workspace.
//   - Enforcement is off unless VITE_BILLING_ENFORCED === "true", so this
//     branch runs normally while Stripe is being set up.
//   - Checkout/webhooks are Supabase Edge Functions (see supabase/functions/)
//     which need STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET before deploy.
//   - The subscriptions table lives in supabase/migrations/002_billing.sql
//     and is NOT applied to the production database until this ships.
// ============================================================================
import { supabase } from "./supabase";

export const BILLING_ENFORCED =
  import.meta.env.VITE_BILLING_ENFORCED === "true";

// Active statuses that grant access.
const ACTIVE = ["active", "trialing"];

// Returns { status: "active" | "inactive" | "unknown" }.
// Tolerant of the subscriptions table not existing yet (pre-launch DBs).
export async function fetchSubscription() {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { status: "unknown", detail: error.message };
    if (!data) return { status: "inactive" };
    return {
      status: ACTIVE.includes(data.status) ? "active" : "inactive",
      raw: data,
    };
  } catch (err) {
    return { status: "unknown", detail: err.message };
  }
}

// Kicks off Stripe Checkout via the edge function. Requires the function to
// be deployed with Stripe keys; surfaces a clear error until then.
export async function startCheckout() {
  const { data, error } = await supabase.functions.invoke(
    "create-checkout-session",
    { body: { returnUrl: window.location.origin + "/billing" } }
  );
  if (error) {
    throw new Error(
      "Payments aren't switched on yet — Stripe keys still need to be configured."
    );
  }
  if (data?.url) {
    window.location.assign(data.url);
  } else {
    throw new Error("Could not start checkout — no session URL returned.");
  }
}
