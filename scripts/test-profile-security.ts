/**
 * FR-08 Security Test Suite — /profil endpoint
 * Menguji RLS dan API protection pada /api/profile/update dan /api/profile/upload-photo
 *
 * Jalankan: npm run test:profil
 * (Pastikan dev server berjalan di localhost:3000)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ─── load .env.local ───────────────────────────────────────────────────────
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
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_PW = process.env.DEFAULT_STUDENT_PASSWORD!;
const BASE_URL = "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_KEY || !DEFAULT_PW) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_STUDENT_PASSWORD wajib diisi.");
  process.exit(1);
}

// admin client untuk lookup NIM → auth.users
const adminSupabase = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── helper: login via REST (mendapat cookie sesi) ─────────────────────────
async function loginAndGetCookies(nim: string, password: string): Promise<{ cookies: string; userId: string } | null> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nim, password }),
    redirect: "manual",
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");

  if (!res.ok && res.status !== 302) return null;

  // ambil user id dari Supabase admin
  const { data: users } = await adminSupabase.from("profiles").select("id").eq("nim", nim).single();
  if (!users) return null;

  return { cookies: cookieStr, userId: users.id };
}

// ─── helper: request ke /api/profile/update dengan cookie sesi ────────────
async function profileUpdate(cookies: string, payload: Record<string, any>) {
  const res = await fetch(`${BASE_URL}/api/profile/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookies,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// ─── helper: request upload dengan cookie sesi ────────────────────────────
async function uploadPhoto(cookies: string, fileContent: Buffer, mimeType: string, sizeLabel: string) {
  const form = new FormData();
  const blob = new Blob([fileContent as any], { type: mimeType });
  form.append("file", blob, `test-avatar.${mimeType.split("/")[1] ?? "bin"}`);
  const res = await fetch(`${BASE_URL}/api/profile/upload-photo`, {
    method: "POST",
    headers: { "Cookie": cookies },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// ─── WARNA terminal ────────────────────────────────────────────────────────
const G = "\x1b[32m✅";
const R = "\x1b[31m❌";
const Y = "\x1b[33m⚠️";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const results: { label: string; ok: boolean; detail: string }[] = [];

function assert(label: string, cond: boolean, detail: string) {
  if (cond) {
    passed++;
    results.push({ label, ok: true, detail });
    console.log(`  ${G} ${label}${RESET}`);
  } else {
    failed++;
    results.push({ label, ok: false, detail });
    console.log(`  ${R} ${label} — ${detail}${RESET}`);
  }
}

// ─── NIM mahasiswa (dua akun berbeda untuk tes lintas-akun) ───────────────
// Mahasiswa A: NIM 1 (bukan pengurus)
const NIM_A = "062530801574"; // Aflah Muhammad Shafin
// Mahasiswa B: NIM 2
const NIM_B = "062530801575"; // akun berbeda
// Ketua: M. Zidal Muttaqin
const NIM_KETUA = "062530801587";

// ─── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("   FR-08 · Security Test Suite · /profil & API");
  console.log("══════════════════════════════════════════════════════\n");

  // ── Login mahasiswa A ──
  console.log("⏳ Login sebagai Mahasiswa A …");
  const sesA = await loginAndGetCookies(NIM_A, DEFAULT_PW);
  if (!sesA) {
    console.error(`${R} Gagal login Mahasiswa A (NIM ${NIM_A}). Pastikan akun aktif & dev server jalan.${RESET}\n`);
    process.exit(1);
  }
  console.log(`   → user id: ${sesA.userId}\n`);

  // ── Login mahasiswa B ──
  console.log("⏳ Login sebagai Mahasiswa B …");
  const sesB = await loginAndGetCookies(NIM_B, DEFAULT_PW);
  if (!sesB) {
    console.log(`  ${Y}  Mahasiswa B (NIM ${NIM_B}) tidak bisa login; test lintas-akun di-skip.\n${RESET}`);
  } else {
    console.log(`   → user id: ${sesB.userId}\n`);
  }

  // ── Login ketua ──
  console.log("⏳ Login sebagai Ketua (super_admin) …");
  const sesKetua = await loginAndGetCookies(NIM_KETUA, DEFAULT_PW);
  if (!sesKetua) {
    console.log(`  ${Y}  Akun ketua tidak bisa login; tes super_admin di-skip.\n${RESET}`);
  } else {
    console.log(`   → user id: ${sesKetua.userId}\n`);
  }

  // ══════════════════════════════════════════════════
  // TEST 1: Mahasiswa update field yang diizinkan
  // ══════════════════════════════════════════════════
  console.log("── TES 1: Mahasiswa mengubah field yang diizinkan ───────");
  {
    const r = await profileUpdate(sesA.cookies, {
      nickname: "TestNick",
      bio: "Bio uji coba otomatis.",
      birthday_day: 15,
      birthday_month: 8,
      photo_public: false,
      birthday_public: true,
    });
    assert("Status 200 pada update nickname/bio/ulang tahun/privasi", r.status === 200, `status=${r.status} body=${JSON.stringify(r.json)}`);
    assert("Response berisi success:true", r.json?.success === true, JSON.stringify(r.json));
    assert("nickname terbaru terbaca di response", r.json?.profile?.nickname === "TestNick", JSON.stringify(r.json?.profile));
    assert("birthday_month terbaca di response (8)", r.json?.profile?.birthday_month === 8, JSON.stringify(r.json?.profile));
  }

  // ══════════════════════════════════════════════════
  // TEST 2: Mahasiswa mencoba ubah field terproteksi
  // ══════════════════════════════════════════════════
  console.log("\n── TES 2: Blokir perubahan field terproteksi ────────────");
  const protectedTests: Array<[string, Record<string, any>]> = [
    ["role", { role: "super_admin" }],
    ["can_manage_kas", { can_manage_kas: true }],
    ["is_active", { is_active: false }],
    ["nim", { nim: "000000000000" }],
    ["full_name", { full_name: "HACKER TEST" }],
  ];
  for (const [field, payload] of protectedTests) {
    const r = await profileUpdate(sesA.cookies, payload);
    assert(`Kolom '${field}' ditolak (HTTP 403)`, r.status === 403, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }

  // ══════════════════════════════════════════════════
  // TEST 3: Mahasiswa A tidak bisa ubah profil Mahasiswa B
  // ══════════════════════════════════════════════════
  console.log("\n── TES 3: Isolasi antar-akun (A tidak bisa ubah B) ─────");
  if (sesB) {
    const r = await profileUpdate(sesA.cookies, {
      target_id: sesB.userId,
      nickname: "HijackedByA",
    });
    assert("Target profil berbeda ditolak (HTTP 403)", r.status === 403, `status=${r.status} body=${JSON.stringify(r.json)}`);
  } else {
    console.log(`  ${Y}  Di-skip (Mahasiswa B tidak bisa login)${RESET}`);
  }

  // ══════════════════════════════════════════════════
  // TEST 4: Validasi upload foto
  // ══════════════════════════════════════════════════
  console.log("\n── TES 4: Validasi file upload foto ─────────────────────");

  // 4a. Tolak file bukan gambar (PDF)
  {
    const fakeFile = Buffer.from("%PDF-1.4 fake PDF content");
    const r = await uploadPhoto(sesA.cookies, fakeFile, "application/pdf", "<1KB PDF");
    assert("Tolak format bukan gambar (PDF → 400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }

  // 4b. Tolak file > 2 MB (simulasi dengan fake WebP besar)
  {
    const bigFile = Buffer.alloc(2.1 * 1024 * 1024, 0); // 2.1 MB zeros
    const r = await uploadPhoto(sesA.cookies, bigFile, "image/webp", "2.1MB WebP");
    assert("Tolak file > 2 MB (400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }

  // 4c. Terima WebP valid berukuran kecil (1x1 px WebP minimal)
  {
    // 1×1 px WebP byte sequence (minimal valid WebP)
    const minWebP = Buffer.from([
      0x52,0x49,0x46,0x46,0x24,0x00,0x00,0x00,0x57,0x45,0x42,0x50,
      0x56,0x50,0x38,0x4C,0x17,0x00,0x00,0x00,0x2F,0x00,0x00,0x00,
      0x00,0x00,0x00,0xFE,0x00,0x00,0xFE,0x00,0x00,0x01,0x68,0x00,
      0x00,0xFE,0xFF,0x80,0x00,0x00,
    ]);
    const r = await uploadPhoto(sesA.cookies, minWebP, "image/webp", "1×1 WebP");
    // Terima 200 atau 400 (jika Supabase storage reject pixel tunggal); yg penting bukan 401/403
    assert("Upload WebP valid tidak di-block oleh autentikasi (bukan 401/403)", r.status !== 401 && r.status !== 403, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }

  // ══════════════════════════════════════════════════
  // TEST 5: Validasi ulang tahun (hari & bulan)
  // ══════════════════════════════════════════════════
  console.log("\n── TES 5: Validasi birthday_day & birthday_month ────────");

  // 5a. Hari 0 (tidak valid)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_day: 0 });
    assert("Tolak birthday_day=0 (400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
  // 5b. Hari 32 (tidak valid)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_day: 32 });
    assert("Tolak birthday_day=32 (400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
  // 5c. Bulan 0 (tidak valid)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_month: 0 });
    assert("Tolak birthday_month=0 (400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
  // 5d. Bulan 13 (tidak valid)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_month: 13 });
    assert("Tolak birthday_month=13 (400)", r.status === 400, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
  // 5e. Tanggal valid (hari 29, bulan 2 → diterima; API tidak validasi kalender)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_day: 29, birthday_month: 2 });
    assert("Terima birthday_day=29 bulan=2 (200)", r.status === 200, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
  // 5f. Reset ke null (hapus ulang tahun)
  {
    const r = await profileUpdate(sesA.cookies, { birthday_day: null, birthday_month: null });
    assert("Terima reset birthday ke null (200)", r.status === 200, `status=${r.status} body=${JSON.stringify(r.json)}`);
    if (r.json?.profile) {
      assert("birthday_day adalah null setelah reset", r.json.profile.birthday_day === null, JSON.stringify(r.json.profile));
      assert("Tahun lahir tidak ada di response (tidak ada field birth_year)", !("birth_year" in r.json.profile), JSON.stringify(r.json.profile));
    }
  }

  // ══════════════════════════════════════════════════
  // TEST 6: Request tanpa sesi → 401
  // ══════════════════════════════════════════════════
  console.log("\n── TES 6: Tanpa sesi harus dapat 401 ────────────────────");
  {
    const r = await profileUpdate("", { nickname: "ghost" });
    assert("Tanpa cookie → 401", r.status === 401, `status=${r.status}`);
  }

  // ══════════════════════════════════════════════════
  // TEST 7: Super admin boleh ubah profil sendiri field biasa
  // ══════════════════════════════════════════════════
  if (sesKetua) {
    console.log("\n── TES 7: Super admin dapat mengubah profil sendiri ─────");
    const r = await profileUpdate(sesKetua.cookies, {
      nickname: "Zidal",
      bio: "Ketua Kelas 3IB — M. Zidal Muttaqin.",
    });
    assert("Ketua: update nickname & bio berhasil (200)", r.status === 200, `status=${r.status} body=${JSON.stringify(r.json)}`);
  }

  // ══════════════════════════════════════════════════
  // RINGKASAN
  // ══════════════════════════════════════════════════
  const total = passed + failed;
  console.log("\n══════════════════════════════════════════════════════");
  console.log("   RINGKASAN HASIL TES");
  console.log("══════════════════════════════════════════════════════");
  console.log(`   Total tes  : ${total}`);
  console.log(`   ${G} Lulus   : ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`   ${R} Gagal   : ${failed}${RESET}`);
    console.log("\n   Detail kegagalan:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`   ${R} ${r.label}${RESET}`);
      console.log(`        → ${r.detail}`);
    }
  } else {
    console.log(`   🎉 Semua tes lulus — keamanan profil FR-08 terkonfirmasi.\n`);
  }
  console.log("══════════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
})();
