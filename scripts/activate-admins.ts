import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Helper memuat .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function activateAdmins() {
  console.log("⚡ Mengaktifkan akun 4 Pengurus Kelas (Ketua, Wakil, Sekretaris, Bendahara)...");

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: true })
    .in("role", ["super_admin", "admin"])
    .select("nim, full_name, role, position, is_active");

  if (error) {
    console.error("❌ Gagal mengaktifkan akun pengurus:", error.message);
    process.exit(1);
  }

  console.log("✅ Berhasil mengaktifkan akun pengurus:");
  data.forEach((p) => {
    console.log(` - [AKTIF] ${p.nim} | ${p.full_name} (${p.position || p.role})`);
  });
  console.log("\nSekarang Ketua Kelas (062530801587) sudah bisa login langsung di /login!");
}

activateAdmins();
