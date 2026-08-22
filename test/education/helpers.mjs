// Shared helpers for the Education test suites. Reads the seed output written
// by scripts/education/seed-demo.mjs (or SEED_* env vars) and signs in as the
// seeded accounts through the same anon client + PostgREST the browser uses.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(here, "..", "..", "scripts", "education", "seed-output.local.json");

export function loadEnv() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  let seed = null;
  if (existsSync(SEED_FILE)) {
    try { seed = JSON.parse(readFileSync(SEED_FILE, "utf8")); } catch { seed = null; }
  }
  const password = process.env.SEED_PASSWORD || seed?.password;
  const accounts = seed?.accounts || null;
  const ready = !!(url && anon && password && accounts);
  const reason = !url || !anon
    ? "SUPABASE_URL / SUPABASE_ANON_KEY not set"
    : !accounts
      ? `no seed output at ${SEED_FILE} — run scripts/education/seed-demo.mjs first`
      : "";
  return { url, anon, password, seed, accounts, ready, reason };
}

export async function signIn(env, email) {
  const c = createClient(env.url, env.anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: env.password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}

export function student(env, who) {
  return (env.accounts?.students || []).find((s) => s.who === who && !s.error) || null;
}

// "This call must be refused" — PostgREST returns an error object, never throws.
export async function expectRefused(promise, label) {
  const res = await promise;
  if (!res.error) {
    throw new Error(`${label}: expected the database to refuse this, but it succeeded with ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  return res.error;
}
