// ============================================================================
// ⚠️  TEMPORARY PILOT BYPASS — MUST BE DISABLED BEFORE ANY OTHER REAL CLIENT'S
//     DATA GOES INTO THIS SYSTEM (beyond the current 2–3 week builder pilot).
//
// While `app_config.bypass_auth` is TRUE in Supabase, anyone opening the app
// with no session is automatically signed in as the Builder Admin account —
// no login screen, no credentials typed. All of their actions are REAL,
// persisted Supabase writes under that account.
//
// To turn the pilot off (no rebuild / redeploy needed):
//   1. Supabase dashboard → SQL editor →
//        update public.app_config set bypass_auth = false where id = 1;
//   2. Rotate the Builder Admin password (Auth → Users), because the pilot
//      credentials below ship inside the public JS bundle while this exists.
//   3. Longer term: delete this file and its two call sites in AuthContext.
//
// The real Supabase Auth system is untouched — with the flag off, the normal
// login screen and password checking are exactly as built.
// ============================================================================
import { supabase } from "./supabase";

// Pilot account the bypass signs visitors into (role: builder_admin).
export const PILOT_CREDENTIALS = {
  email: "admin@ohsbuildervictoria.com.au",
  password: "Arlington!Docklands2026",
};

// Reads the kill switch. Fails closed: any error → bypass off → real login.
export async function isPilotBypassEnabled() {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("bypass_auth")
      .eq("id", 1)
      .maybeSingle();
    if (error) return false;
    return data?.bypass_auth === true;
  } catch {
    return false;
  }
}
