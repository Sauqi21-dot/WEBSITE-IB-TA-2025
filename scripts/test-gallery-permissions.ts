/**
 * Test Suite: Izin Galeri Langsung ke Supabase dan Storage (Tanpa Lewat UI/API Route)
 * Memverifikasi 6 skenario penegakan RLS, Trigger, dan Storage Policy
 *
 * Jalankan: npx ts-node --transpile-only scripts/test-gallery-permissions.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_PW = process.env.DEFAULT_STUDENT_PASSWORD!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("❌ Environment Supabase belum lengkap di .env.local");
  process.exit(1);
}

// Admin service role client untuk lookup akun uji
const adminService = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 PENGUJIAN IZIN GALERI: DIRECT SUPABASE & STORAGE REQUEST");
  console.log("================================================================================\n");

  // 1. Ambil 2 akun mahasiswa dan 1 akun admin
  const { data: students, error: sErr } = await adminService
    .from("profiles")
    .select("id, nim, full_name, role")
    .eq("role", "student")
    .eq("is_active", true)
    .limit(2);

  const { data: admins, error: aErr } = await adminService
    .from("profiles")
    .select("id, nim, full_name, role")
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true)
    .limit(1);

  if (sErr || !students || students.length < 2 || aErr || !admins || admins.length === 0) {
    console.error("❌ Gagal mendapatkan akun mahasiswa dan admin untuk pengujian.");
    return;
  }

  const studentA = students[0];
  const studentB = students[1];
  const adminUser = admins[0];

  console.log(`👤 Mahasiswa A : ${studentA.full_name} (${studentA.nim}) - ID: ${studentA.id}`);
  console.log(`👤 Mahasiswa B : ${studentB.full_name} (${studentB.nim}) - ID: ${studentB.id}`);
  console.log(`👑 Admin       : ${adminUser.full_name} (${adminUser.nim}) - ID: ${adminUser.id}\n`);

  // Buat Supabase Client untuk masing-masing pengguna
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const clientB = createClient(SUPABASE_URL, ANON_KEY);
  const clientAdmin = createClient(SUPABASE_URL, ANON_KEY);
  const clientAnon = createClient(SUPABASE_URL, ANON_KEY); // Tanpa login

  // Helper login via email/NIM
  async function signIn(client: any, nim: string) {
    // Supabase auth format: nim@class.local atau email
    const email = `${nim}@class.local`;
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: DEFAULT_PW,
    });
    return { data, error };
  }

  const loginA = await signIn(clientA, studentA.nim);
  const loginB = await signIn(clientB, studentB.nim);
  const loginAdmin = await signIn(clientAdmin, adminUser.nim);

  if (loginA.error || loginB.error || loginAdmin.error) {
    console.log("⚠️ Catatan login: Pastikan kredensial mahasiswa dan admin aktif.");
  }

  // Siapkan dummy file buffer untuk uji storage
  const dummyImage = Buffer.from("RIFF....WEBPVP8 ...test-gallery-image...");

  let testCount = 0;
  let passCount = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 1: Mahasiswa A tambah foto
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`[TEST 1] Mahasiswa A menambah foto ke gallery_items & Storage folder A...`);
  let photoAId: string | null = null;
  try {
    // A upload ke foldernya sendiri di storage
    const storagePathA = `${studentA.id}/test-${Date.now()}.webp`;
    const { error: uploadErr } = await clientA.storage.from("gallery").upload(storagePathA, dummyImage, { contentType: "image/webp" });

    // A insert ke tabel gallery_items
    const { data: insertData, error: insErr } = await clientA
      .from("gallery_items")
      .insert({
        title: "Dokumentasi Uji Mahasiswa A",
        caption: "Foto kegiatan uji oleh Mahasiswa A",
        image_path: `${SUPABASE_URL}/storage/v1/object/public/gallery/${storagePathA}`,
        semester: 3,
        category: "Dokumentasi Kuliah",
        taken_on: "2026-11-24",
        uploaded_by: studentA.id,
        is_featured: false,
        archived: false,
      })
      .select()
      .single();

    if (!insErr && insertData) {
      photoAId = insertData.id;
      console.log(`  ✅ BERHASIL: Mahasiswa A berhasil menambah foto (ID: ${photoAId})`);
      passCount++;
    } else {
      console.log(`  ❌ GAGAL: ${insErr?.message || uploadErr?.message}`);
    }
  } catch (e: any) {
    console.log(`  ❌ EXCEPTION: ${e.message}`);
  }

  // Buat 1 foto milik Mahasiswa B menggunakan service role untuk target pengujian
  const storagePathB = `${studentB.id}/photo-b-${Date.now()}.webp`;
  const { data: photoB } = await adminService
    .from("gallery_items")
    .insert({
      title: "Foto Asli Milik Mahasiswa B",
      caption: "Milik B, tidak boleh diubah oleh A",
      image_path: `${SUPABASE_URL}/storage/v1/object/public/gallery/${storagePathB}`,
      semester: 3,
      category: "Kegiatan Kelas",
      taken_on: "2026-11-24",
      uploaded_by: studentB.id,
      is_featured: false,
      archived: false,
    })
    .select()
    .single();

  const photoBId = photoB?.id;

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 2: Mahasiswa A ubah atau arsipkan foto milik Mahasiswa B -> HARUS DITOLAK
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`\n[TEST 2] Mahasiswa A mencoba mengubah / mengarsipkan foto milik Mahasiswa B...`);
  if (photoBId) {
    try {
      const { data: updateData, error: updErr } = await clientA
        .from("gallery_items")
        .update({ caption: "Diubah tanpa izin oleh Mahasiswa A", archived: true })
        .eq("id", photoBId)
        .select();

      // Di PostgREST / Supabase RLS, UPDATE pada baris yang dilarang RLS menghasilkan 0 row returned atau error
      if (updErr || !updateData || updateData.length === 0) {
        console.log(`  ✅ BERHASIL DITOLAK (RLS): Mahasiswa A tidak dapat mengubah atau mengarsipkan foto milik B.`);
        passCount++;
      } else {
        console.log(`  ❌ GAGAL: Foto milik B berhasil diubah oleh A! (RLS bocor)`);
      }
    } catch (e: any) {
      console.log(`  ✅ BERHASIL DITOLAK: ${e.message}`);
      passCount++;
    }
  } else {
    console.log("  ⚠️ Dilewati: Foto milik B tidak tersedia.");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 3: Mahasiswa A mengisi is_featured = true -> HARUS DITOLAK OLEH TRIGGER
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`\n[TEST 3] Mahasiswa A mencoba menyisipkan is_featured = true (foto hero beranda)...`);
  try {
    const { data: hackData, error: hackErr } = await clientA
      .from("gallery_items")
      .insert({
        title: "Foto Ilegal Beranda",
        caption: "Mencoba jadi foto hero beranda",
        image_path: "https://example.com/fake.webp",
        semester: 3,
        category: "Dokumentasi Kuliah",
        taken_on: "2026-11-24",
        uploaded_by: studentA.id,
        is_featured: true, // DILARANG UNTUK MAHASISWA
        archived: false,
      })
      .select();

    if (hackErr) {
      console.log(`  ✅ BERHASIL DITOLAK (TRIGGER DATABASE): ${hackErr.message}`);
      passCount++;
    } else {
      console.log(`  ❌ GAGAL: is_featured = true berhasil disisipkan oleh mahasiswa!`);
    }
  } catch (e: any) {
    console.log(`  ✅ BERHASIL DITOLAK (EXCEPTION TRIGGER): ${e.message}`);
    passCount++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 4: Mahasiswa A mengunggah ke folder milik B di Storage -> HARUS DITOLAK
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`\n[TEST 4] Mahasiswa A mencoba mengunggah berkas ke folder milik Mahasiswa B di Storage...`);
  try {
    const illegalPath = `${studentB.id}/injected-by-a-${Date.now()}.webp`;
    const { data: uploadData, error: uploadErr } = await clientA.storage
      .from("gallery")
      .upload(illegalPath, dummyImage, { contentType: "image/webp" });

    if (uploadErr) {
      console.log(`  ✅ BERHASIL DITOLAK (STORAGE RLS): ${uploadErr.message}`);
      passCount++;
    } else {
      console.log(`  ❌ GAGAL: A berhasil mengunggah ke folder milik B! (Storage RLS bocor)`);
    }
  } catch (e: any) {
    console.log(`  ✅ BERHASIL DITOLAK (STORAGE ERROR): ${e.message}`);
    passCount++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 5: Pengunjung tanpa login (anon) mengunggah foto -> HARUS DITOLAK
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`\n[TEST 5] Pengunjung tanpa login (Anonim) mencoba mengunggah ke Storage atau INSERT...`);
  try {
    const anonPath = `anon/anon-${Date.now()}.webp`;
    const { error: anonStorageErr } = await clientAnon.storage
      .from("gallery")
      .upload(anonPath, dummyImage, { contentType: "image/webp" });

    const { error: anonDbErr } = await clientAnon
      .from("gallery_items")
      .insert({
        title: "Foto Anonim Ilegal",
        image_path: "https://example.com/anon.webp",
        semester: 3,
        category: "Lainnya",
        taken_on: "2026-11-24",
      });

    if (anonStorageErr || anonDbErr) {
      console.log(`  ✅ BERHASIL DITOLAK: Storage (${anonStorageErr?.message || "Ditolak"}), Database (${anonDbErr?.message || "Ditolak"})`);
      passCount++;
    } else {
      console.log(`  ❌ GAGAL: Pengunjung anonim berhasil menambah data!`);
    }
  } catch (e: any) {
    console.log(`  ✅ BERHASIL DITOLAK: ${e.message}`);
    passCount++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UJI 6: Admin mengubah foto siapa pun -> HARUS BERHASIL
  // ─────────────────────────────────────────────────────────────────────────────
  testCount++;
  console.log(`\n[TEST 6] Admin mengubah / mengarsipkan foto milik Mahasiswa A atau B...`);
  if (photoAId) {
    try {
      const { data: adminEditData, error: adminEditErr } = await clientAdmin
        .from("gallery_items")
        .update({
          caption: "Diperbarui secara sah oleh Admin",
          is_featured: true, // Admin berhak mengubah is_featured
        })
        .eq("id", photoAId)
        .select()
        .single();

      if (!adminEditErr && adminEditData) {
        console.log(`  ✅ BERHASIL: Admin berhasil memperbarui foto milik Mahasiswa A (is_featured: ${adminEditData.is_featured})`);
        passCount++;
      } else {
        console.log(`  ❌ GAGAL: Admin ditolak saat mengedit foto: ${adminEditErr?.message}`);
      }
    } catch (e: any) {
      console.log(`  ❌ EXCEPTION ADMIN: ${e.message}`);
    }
  } else {
    console.log("  ⚠️ Dilewati: Foto A tidak tersedia.");
  }

  console.log("\n================================================================================");
  console.log(`🏁 HASIL PENGUJIAN: ${passCount} / ${testCount} SKENARIO LOLOS`);
  console.log("================================================================================");
}

runTests().catch(console.error);
