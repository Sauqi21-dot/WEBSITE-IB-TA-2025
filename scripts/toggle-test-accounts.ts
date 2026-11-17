/**
 * Aktifkan sementara 2 akun mahasiswa biasa untuk keperluan security test FR-08.
 * Jalankan sebelum: npm run test:profil
 * Nonaktifkan setelah: npm run deactivate:test-accounts
 */
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > -1) {
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_NIMS = ["062530801574", "062530801575"]; // Aflah, Afrita
const ACTION = process.argv[2] === "deactivate" ? false : true;

(async () => {
  for (const nim of TEST_NIMS) {
    const { data, error } = await sb
      .from("profiles")
      .update({ is_active: ACTION, must_change_password: false })
      .eq("nim", nim)
      .select("full_name, is_active")
      .single();
    if (error) {
      console.error(`❌ ${nim}: ${error.message}`);
    } else {
      console.log(`${ACTION ? "✅ Aktifkan" : "🔒 Nonaktifkan"}: ${data?.full_name} → is_active=${data?.is_active}`);
    }
  }
  console.log("Selesai.");
})();
