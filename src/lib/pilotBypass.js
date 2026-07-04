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

// PILOT ONLY: all tradies share this one worker-role auth account under the
// hood. The /stakeholder screen asks for their personal username (workers.
// login_handle) + the pilot password "123", then attaches their own worker id
// to the session so each tradie only ever sees their own site/tasks/SWMS.
// No real security during the pilot — replace with per-user accounts after.
export const PILOT_STAKEHOLDER_CREDENTIALS = {
  email: "admin+stakeholder@ohsbuildervictoria.com.au",
  password: "Arlington!Bendigo2026",
};

export const PILOT_STAKEHOLDER_PASSWORD = "123";

// The stakeholder entry route must never be hijacked by the builder
// auto-login, or tradies could never reach their own sign-in screen.
export const STAKEHOLDER_LOGIN_PATH = "/stakeholder";

const PILOT_WORKER_KEY = "ohsbv-pilot-worker";

export function savePilotWorker(worker) {
  try {
    localStorage.setItem(
      PILOT_WORKER_KEY,
      JSON.stringify({ id: worker.id, name: worker.name })
    );
  } catch {
    /* private mode — session just won't survive refresh */
  }
}

export function loadPilotWorker() {
  try {
    const raw = localStorage.getItem(PILOT_WORKER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPilotWorker() {
  try {
    localStorage.removeItem(PILOT_WORKER_KEY);
  } catch {
    /* ignore */
  }
}

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
