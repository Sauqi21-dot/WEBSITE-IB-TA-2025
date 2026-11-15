import { STUDENTS_SEED_DATA } from "./students-data";
import { nimToEmail, emailToNim, validateNewPassword } from "../src/lib/auth";
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from "../src/lib/rate-limit";
import * as fs from "fs";
import * as path from "path";

console.log("==================================================================");
console.log("🧪 MENJALANKAN PENGUJIAN FASE 3: FONDASI KELAS IB 2025");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// 1. Verifikasi Data Absen.pdf (24 Mahasiswa & Pengurus)
console.log("[1] Memverifikasi Data Mahasiswa dari Absen.pdf:");
assert(STUDENTS_SEED_DATA.length === 24, "Total mahasiswa harus tepat 24 orang");

const ketua = STUDENTS_SEED_DATA.find((s) => s.nim === "062530801587");
assert(
  Boolean(ketua && ketua.full_name === "M. ZIDAL MUTTAQIN" && ketua.role === "super_admin" && ketua.position === "Ketua Kelas"),
  "Ketua Kelas: M. Zidal Muttaqin (NIM 062530801587) adalah Super Admin"
);

const wakil = STUDENTS_SEED_DATA.find((s) => s.nim === "062530801576");
assert(
  Boolean(wakil && wakil.full_name === "AHMAD SAUQI EFRIANSYAH" && wakil.role === "admin" && wakil.position === "Wakil Ketua Kelas"),
  "Wakil Ketua: Ahmad Sauqi Efriansyah (NIM 062530801576) adalah Admin"
);

const sekretaris = STUDENTS_SEED_DATA.find((s) => s.nim === "062530801592");
assert(
  Boolean(sekretaris && sekretaris.full_name === "PUTRI ALIKA SARI" && sekretaris.role === "admin" && sekretaris.position === "Sekretaris"),
  "Sekretaris: Putri Alika Sari (NIM 062530801592) adalah Admin"
);

const bendahara = STUDENTS_SEED_DATA.find((s) => s.nim === "062530801595");
assert(
  Boolean(bendahara && bendahara.full_name === "SALSABILA JULIA MECCA" && bendahara.role === "admin" && bendahara.can_manage_kas === true && bendahara.position === "Bendahara"),
  "Bendahara: Salsabila Julia Mecca (NIM 062530801595) adalah Admin dengan permission can_manage_kas = true"
);

// 2. Pemetaan NIM ke Email Internal
console.log("\n[2] Memverifikasi Pemetaan NIM ke Internal Email (FR-07):");
const emailSample = nimToEmail("062530801587");
assert(emailSample === "062530801587@3ib.internal", "Pemetaan NIM menghasilkan nim@3ib.internal");
assert(emailToNim(emailSample) === "062530801587", "Ekstraksi email menghasilkan NIM asli");

// 3. Validasi Aturan Ganti Password (FR-07, AC-04)
console.log("\n[3] Memverifikasi Aturan Ganti Password Wajib:");
const defaultPass = "PasswordAwal123!";
const testNim = "062530801587";

const tooShort = validateNewPassword({
  newPassword: "short",
  confirmPassword: "short",
  nim: testNim,
  defaultPassword: defaultPass,
});
assert(!tooShort.valid && Boolean(tooShort.error?.includes("minimal 8 karakter")), "Menolak password kurang dari 8 karakter");

const sameAsNim = validateNewPassword({
  newPassword: testNim,
  confirmPassword: testNim,
  nim: testNim,
  defaultPassword: defaultPass,
});
assert(!sameAsNim.valid && Boolean(sameAsNim.error?.includes("tidak boleh sama dengan NIM")), "Menolak password yang sama dengan NIM");

const sameAsDefault = validateNewPassword({
  newPassword: defaultPass,
  confirmPassword: defaultPass,
  nim: testNim,
  defaultPassword: defaultPass,
});
assert(!sameAsDefault.valid && Boolean(sameAsDefault.error?.includes("password default")), "Menolak password yang sama dengan default");

const mismatch = validateNewPassword({
  newPassword: "NewSecretPassword123",
  confirmPassword: "DifferentPassword123",
  nim: testNim,
  defaultPassword: defaultPass,
});
assert(!mismatch.valid && Boolean(mismatch.error?.includes("tidak cocok")), "Menolak jika konfirmasi password tidak cocok");

const validPass = validateNewPassword({
  newPassword: "SandiBaru3IB2025!",
  confirmPassword: "SandiBaru3IB2025!",
  nim: testNim,
  defaultPassword: defaultPass,
});
assert(validPass.valid, "Menerima password valid sesuai seluruh ketentuan");

// 4. Rate Limiting Brute Force Protection (FR-07)
console.log("\n[4] Memverifikasi Proteksi Rate Limit Login:");
const rateLimitKey = "test_rate_limit_nim";
resetLoginAttempts(rateLimitKey);

let rlCheck = checkLoginRateLimit(rateLimitKey);
assert(rlCheck.allowed && rlCheck.remainingAttempts === 5, "Mula-mula tersedia 5 percobaan");

for (let i = 0; i < 5; i++) {
  recordFailedLogin(rateLimitKey);
}

rlCheck = checkLoginRateLimit(rateLimitKey);
assert(!rlCheck.allowed && (rlCheck.retryAfterSeconds ?? 0) > 0, "Setelah 5 kegagalan berturut-turut, login dikunci sementara");

resetLoginAttempts(rateLimitKey);
rlCheck = checkLoginRateLimit(rateLimitKey);
assert(rlCheck.allowed, "Reset login mengembalikan akses");

// 5. Verifikasi Keamanan Skema SQL & View Publik (AC-02 & AC-12)
console.log("\n[5] Memverifikasi Skema SQL & Kebijakan Keamanan:");
const schemaPath = path.resolve(__dirname, "../supabase/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");

assert(schemaSql.includes("CREATE OR REPLACE VIEW public.public_students"), "View public_students terdefinisi");
// AC-02: Verifikasi bahwa view public_students TIDAK menyertakan kolom nim sebagai output
// Cari blok definisi view, lalu pastikan tidak ada SELECT p.nim di dalamnya
const viewBlock = schemaSql.match(/CREATE OR REPLACE VIEW public\.public_students AS([\s\S]*?)FROM public\.profiles/i)?.[1] ?? "";
assert(!viewBlock.match(/\bp\.nim\b/i), "AC-02: View public_students TIDAK MEMUAT kolom nim (p.nim)");
assert(schemaSql.includes("ENABLE ROW LEVEL SECURITY"), "Row Level Security (RLS) diaktifkan");
assert(schemaSql.includes("void_kas_transaction"), "Fungsi khusus void_kas_transaction terdefinisi untuk pembatalan transaksi dengan alasan wajib");

// 6. Verifikasi Avatar Referensi (24 File)
console.log("\n[6] Memverifikasi 24 Foto Referensi Acak:");
let avatarsCount = 0;
for (let i = 1; i <= 24; i++) {
  const avatarFile = path.resolve(__dirname, `../public/avatars/avatar-${i}.svg`);
  if (fs.existsSync(avatarFile)) {
    avatarsCount++;
  }
}
assert(avatarsCount === 24, "Tepat 24 file foto/avatar referensi telah dibuat di /public/avatars/");

console.log("\n==================================================================");
console.log(`HASIL AKHIR: ${passed} Passed, ${failed} Failed`);
if (failed === 0) {
  console.log("🎉 SEMUA UJI FASE 3 (FONDASI) BERHASIL!");
} else {
  console.error("❌ ADA PENGUJIAN YANG GAGAL!");
  process.exit(1);
}
console.log("==================================================================");
