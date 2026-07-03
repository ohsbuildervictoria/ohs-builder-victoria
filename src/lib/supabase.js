import { createClient } from "@supabase/supabase-js";

// Publishable key — safe to ship in client code (RLS enforces access control).
// Can be overridden per-environment via Vite env vars.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://bbbtqhypdjrmlrdabumm.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY ||
  "sb_publishable_K1z0jHepA5olzRIYheCOsg_Nm-OaFXK";

export const supabase = createClient(supabaseUrl, supabaseKey);
