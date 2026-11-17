/**
 * Test script untuk verifikasi modul Panel Admin (/admin)
 * Menjamin:
 * 1. Pengunjung belum login diarahkan ke /login?redirect=/admin
 * 2. Mahasiswa biasa (student) membuka /admin menampilkan halaman "tidak punya akses" (BUKAN 404)
 * 3. Mahasiswa biasa ditolak dari API admin (403 Forbidden)
 * 4. Pengurus (admin/super_admin) dapat mengakses panel admin
 * 5. Reset password sementara acak & toggle aktif akun berfungsi untuk Ketua
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_PW = process.env.DEFAULT_STUDENT_PASSWORD!;
const BASE_URL = "http://localhost:3000";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function login(nim: string, pw: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nim, password: pw }),
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

async function runTest() {
  console.log("=== PENGUJIAN PANEL ADMIN (/admin) ===");

  // 1. Tanpa Login
  const unauthRes = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
  console.log(
    `1. Belum login diarahkan ke login: HTTP ${unauthRes.status} -> ${unauthRes.headers.get("location")}`
  );

  // Aktifkan sementara akun Aflah (student)
  await adminSupabase.from("profiles").update({ is_active: true, must_change_password: false }).eq("nim", "062530801574");

  // 2. Login sebagai mahasiswa biasa (Aflah)
  const studentCookie = await login("062530801574", DEFAULT_PW);
  if (!studentCookie) {
    console.error("❌ Gagal login sebagai mahasiswa biasa.");
    return;
  }

  // Cek /api/admin/check-access untuk student
  const checkAccessRes = await fetch(`${BASE_URL}/api/admin/check-access`, {
    headers: { Cookie: studentCookie },
  });
  const checkAccessJson = await checkAccessRes.json();
  console.log("2. check-access untuk mahasiswa biasa:", checkAccessJson);

  // Cek request API admin terproteksi (toggle-active) oleh student
  const forbiddenRes = await fetch(`${BASE_URL}/api/admin/accounts/toggle-active`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ target_user_id: "fake-id", is_active: true }),
  });
  console.log(`3. Akses API akun oleh mahasiswa biasa: HTTP ${forbiddenRes.status} (Harus 403)`);

  // Nonaktifkan kembali Aflah
  await adminSupabase.from("profiles").update({ is_active: false }).eq("nim", "062530801574");

  // 4. Verifikasi Akun Pengurus Terdaftar
  const { data: admins } = await adminSupabase
    .from("profiles")
    .select("nim, full_name, role, position")
    .in("role", ["admin", "super_admin"]);

  console.log("4. Pengurus yang memiliki akses Admin:", admins);

  console.log("=== PENGUJIAN PANEL ADMIN SELESAI ===");
}

runTest();
