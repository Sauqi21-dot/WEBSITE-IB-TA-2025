import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { STUDENTS_SEED_DATA } from "./students-data";

// Helper sederhana untuk membaca .env.local jika belum dimuat
function loadEnv() {
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local");
  process.exit(1);
}

if (!defaultPassword || defaultPassword.length < 8) {
  console.error("❌ ERROR: DEFAULT_STUDENT_PASSWORD wajib diisi di .env.local (minimal 8 karakter)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log("==================================================================");
  console.log("🚀 MEMULAI SEED 24 AKUN MAHASISWA KELAS IB 2025");
  console.log("Status Akun Awal: NONAKTIF (is_active = false) sesuai AC-05");
  console.log("Status Password: WAJIB GANTI (must_change_password = true) sesuai AC-04");
  console.log("==================================================================\n");

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const student of STUDENTS_SEED_DATA) {
    const internalEmail = `${student.nim}@3ib.internal`;

    try {
      // 1. Cek apakah user auth sudah ada di auth.users
      const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      let authUser = usersList.users.find((u) => u.email === internalEmail);

      if (!authUser) {
        // Buat user baru di Supabase Auth
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: internalEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: student.full_name,
            nim: student.nim,
            role: student.role,
          },
        });

        if (createError) throw createError;
        authUser = newUser.user;
        createdCount++;
        console.log(`[+] Auth User dibuat: ${student.nim} - ${student.full_name}`);
      } else {
        updatedCount++;
        console.log(`[~] Auth User sudah ada: ${student.nim} - ${student.full_name}`);
      }

      if (!authUser) {
        throw new Error(`Gagal mendapatkan id user auth untuk ${student.nim}`);
      }

      // 2. Upsert ke tabel public.profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authUser.id,
            nim: student.nim,
            full_name: student.full_name,
            nickname: student.nickname,
            photo_path: student.photo_path,
            photo_public: true,
            bio: student.bio,
            position: student.position,
            birthday_day: student.birthday_day,
            birthday_month: student.birthday_month,
            birthday_public: true,
            must_change_password: true,
            is_active: false, // NONAKTIF sampai hari aktivasi sesuai AC-05
            role: student.role,
            can_manage_kas: student.can_manage_kas,
          },
          { onConflict: "nim" }
        );

      if (profileError) throw profileError;

      const roleBadge = student.role === "super_admin"
        ? "🌟 SUPER ADMIN (Ketua)"
        : student.role === "admin"
        ? `🛡️ ADMIN (${student.position || "Pengurus"})`
        : "👤 Mahasiswa";

      console.log(`    ↳ Profile disimpan: ${roleBadge}`);
    } catch (err: any) {
      errorCount++;
      console.error(`❌ Gagal memproses ${student.nim} (${student.full_name}):`, err?.message || err);
    }
  }

  console.log("\n==================================================================");
  console.log(`✅ SEED SELESAI:`);
  console.log(`- Berhasil dibuat: ${createdCount}`);
  console.log(`- Sudah ada / diperbarui: ${updatedCount}`);
  console.log(`- Gagal: ${errorCount}`);
  console.log(`- Total target mahasiswa: ${STUDENTS_SEED_DATA.length}`);
  console.log("Catatan: Semua 24 akun berstatus nonaktif (is_active = false).");
  console.log("Pengurus kelas (Ketua: M. Zidal Muttaqin, Wakil: Ahmad Sauqi Efriansyah,");
  console.log("Sekretaris: Putri Alika Sari, Bendahara: Salsabila Julia Mecca)");
  console.log("telah terdaftar dengan role dan permission masing-masing.");
  console.log("==================================================================");
}

seed().catch((err) => {
  console.error("Fatal error saat seed:", err);
  process.exit(1);
});
