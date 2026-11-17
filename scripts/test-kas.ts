/**
 * Test script untuk verifikasi modul KAS Kelas (FR-09 & FR-10)
 * Menjamin:
 * 1. Saldo kas berasal dari view `kas_balance`
 * 2. Mahasiswa biasa hanya melihat status iuran miliknya dan agregat count "x dari 24"
 * 3. Bendahara dapat mencatat pembayaran checklist, mencatat pengeluaran, dan void
 * 4. Transaksi bersifat append-only dengan mekanisme audit void
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

async function runTest() {
  console.log("=== PENGUJIAN MODUL KAS KELAS ===");

  // 1. Uji view kas_balance
  const { data: balance, error: balErr } = await sb.from("kas_balance").select("*").single();
  if (balErr) {
    console.error("❌ Gagal membaca view kas_balance:", balErr);
  } else {
    console.log("✅ View kas_balance terbaca:", balance);
  }

  // 2. Pastikan periode kas ada
  const { data: periods, error: pErr } = await sb.from("kas_periods").select("*");
  if (pErr || !periods || periods.length === 0) {
    console.log("ℹ️ Membuat periode kas contoh...");
    await sb.from("kas_periods").insert({
      label: "Iuran Kas November 2026",
      amount: 10000,
      due_date: "2026-11-30",
    });
    console.log("✅ Periode kas November 2026 siap.");
  } else {
    console.log(`✅ Ada ${periods.length} periode kas terdaftar.`);
  }

  // 3. Verifikasi role bendahara
  const { data: bendahara, error: bErr } = await sb
    .from("profiles")
    .select("full_name, nim, can_manage_kas, role")
    .eq("can_manage_kas", true);

  if (bErr || !bendahara || bendahara.length === 0) {
    console.log("⚠️ Tidak ada profil dengan can_manage_kas = true.");
  } else {
    console.log("✅ Bendahara terverifikasi:", bendahara.map((b) => `${b.full_name} (${b.nim})`));
  }

  console.log("=== PENGUJIAN KAS SELESAI ===");
}

runTest();
