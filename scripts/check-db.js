const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
const env = {};
lines.forEach(l => { const [k, ...v] = l.split("="); if (k) env[k.trim()] = v.join("=").trim(); });
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
    const { data: users, error: errUsers } = await supabase.auth.admin.listUsers();
    console.log("Auth users count:", users ? users.users.length : 0, "Error:", errUsers?.message || "none");
    const { data: profiles, error: errProf } = await supabase.from("profiles").select("nim, full_name, is_active, role").limit(10);
    console.log("Profiles count:", profiles ? profiles.length : 0, "Error:", errProf?.message || "none");
    if (profiles && profiles.length > 0) {
      console.log("Sample profiles in DB:", profiles);
    }
  } catch (e) {
    console.error("Test error:", e);
  }
}
test();
