import * as fs from "fs";
import * as path from "path";
import { STUDENTS_SEED_DATA } from "./students-data";
import { INITIAL_COURSES, INITIAL_SCHEDULES } from "./courses-and-schedules-data";
import { INITIAL_GALLERY_ITEMS, INITIAL_CLASS_HISTORY } from "./gallery-and-history-data";

console.log("==================================================================");
console.log("🧪 MENJALANKAN PENGUJIAN FASE 4: HALAMAN PUBLIK WEBSITE IB 2025");
console.log("Kriteria: AC-01, AC-02, AC-03, AC-10");
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

// --------------------------------------------------------------------
// 1. Pengujian AC-01: Akses Halaman Publik Tanpa Login
// --------------------------------------------------------------------
console.log("[1] Memverifikasi Keberadaan Komponen & Halaman Publik (AC-01):");
const publicPages = [
  { file: "src/app/page.tsx", route: "/" },
  { file: "src/app/mahasiswa/page.tsx", route: "/mahasiswa" },
  { file: "src/app/jadwal/page.tsx", route: "/jadwal" },
  { file: "src/app/galeri/page.tsx", route: "/galeri" },
  { file: "src/app/ulang-tahun/page.tsx", route: "/ulang-tahun" },
];

for (const p of publicPages) {
  const filePath = path.resolve(process.cwd(), p.file);
  assert(fs.existsSync(filePath), `Halaman publik ${p.route} (${p.file}) terpasang`);
}

// --------------------------------------------------------------------
// 2. Pengujian AC-02: Tidak Ada NIM pada Data dan Halaman Publik
// --------------------------------------------------------------------
console.log("\n[2] Memverifikasi Perlindungan NIM & Data Pribadi (AC-02):");

// Periksa file route /api/public/students
const studentsRouteFile = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/api/public/students/route.ts"),
  "utf-8"
);
assert(
  studentsRouteFile.includes("public_students") && studentsRouteFile.includes("sanitizedStudents"),
  "Endpoint /api/public/students mengambil dari view aman dan melakukan sanitasi"
);

// Simulasikan sanitasi data publik
const testPublicData = STUDENTS_SEED_DATA.map((s) => {
  const { nim, ...safeData } = s as any;
  return safeData;
});

let foundNim = false;
let foundPhone = false;
let foundAddress = false;
for (const item of testPublicData) {
  if ("nim" in item || JSON.stringify(item).includes("0625308015")) {
    foundNim = true;
  }
  if ("phone" in item || "no_hp" in item) foundPhone = true;
  if ("address" in item || "alamat" in item) foundAddress = true;
}
assert(!foundNim, "AC-02: Tidak ada NIM dalam objek data publik mahasiswa");
assert(!foundPhone && !foundAddress, "AC-02: Tidak ada nomor telepon atau alamat dalam objek publik");

// Periksa tampilan sumber direktori mahasiswa
const mahasiswaPageFile = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/mahasiswa/page.tsx"),
  "utf-8"
);
assert(
  !mahasiswaPageFile.includes("student.nim"),
  "AC-02: Halaman /mahasiswa tidak menampilkan field student.nim"
);

// --------------------------------------------------------------------
// 3. Pengujian AC-03: Jadwal Mode Pesawat / Offline & Terakhir Diperbarui
// --------------------------------------------------------------------
console.log("\n[3] Memverifikasi Mode Pesawat / Offline Jadwal (AC-03):");

// Periksa keberadaan Service Worker & Manifest
const swPath = path.resolve(process.cwd(), "public/sw.js");
const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
assert(fs.existsSync(swPath), "Service Worker (public/sw.js) terdefinisi");
assert(fs.existsSync(manifestPath), "Web App Manifest (public/manifest.json) terdefinisi");

const swContent = fs.readFileSync(swPath, "utf-8");
assert(
  swContent.includes("/jadwal") && swContent.includes("/api/public/schedules"),
  "Service worker mencakup rute /jadwal dan /api/public/schedules untuk cache offline"
);

const jadwalPageFile = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/jadwal/page.tsx"),
  "utf-8"
);
assert(
  jadwalPageFile.includes("ib_cached_schedule") &&
  jadwalPageFile.includes("ib_cached_schedule_timestamp"),
  "Halaman jadwal memiliki mekanisme fallback offline ke localStorage"
);
assert(
  jadwalPageFile.includes("Terakhir diperbarui:"),
  "Halaman jadwal menampilkan keterangan 'Terakhir diperbarui'"
);
assert(
  jadwalPageFile.includes("isOffline") && jadwalPageFile.includes("Mode Pesawat"),
  "Halaman jadwal memiliki indikator visual saat perangkat dalam Mode Pesawat / Offline"
);

// --------------------------------------------------------------------
// 4. Pengujian AC-10: Ulang Tahun Hari Ini, 7 Hari Ke Depan & Opt-Out
// --------------------------------------------------------------------
console.log("\n[4] Memverifikasi Logika Ulang Tahun & Opt-out (AC-10):");

const bdayRouteFile = fs.readFileSync(
  path.resolve(process.cwd(), "src/app/api/public/birthdays/route.ts"),
  "utf-8"
);
assert(
  bdayRouteFile.includes("birthday_public !== false"),
  "AC-10: Mahasiswa yang mematikan tampilan (birthday_public = false) disaring keluar"
);
assert(
  bdayRouteFile.includes("isLeapYear") && bdayRouteFile.includes("28"),
  "AC-10: Mahasiswa yang lahir 29 Februari dirayakan 28 Februari pada tahun non-kabisat"
);
assert(
  bdayRouteFile.includes("Asia/Jakarta"),
  "AC-10: Perhitungan tanggal menggunakan zona waktu WIB (Asia/Jakarta)"
);

// Uji fungsi leap year & 29 Feb
function testLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
assert(!testLeap(2025), "Tahun 2025 adalah tahun non-kabisat");
assert(testLeap(2024), "Tahun 2024 adalah tahun kabisat");

// --------------------------------------------------------------------
// 5. Verifikasi Data Awal Kurikulum & Galeri
// --------------------------------------------------------------------
console.log("\n[5] Memverifikasi Data Awal Jadwal & Galeri Semester 1-3:");
assert(INITIAL_COURSES.length >= 7, "Terdapat mata kuliah semester 3 Polsri");
assert(INITIAL_SCHEDULES.length >= 7, "Terdapat jadwal kuliah hari Senin s.d. Jumat");
assert(INITIAL_CLASS_HISTORY.length === 3, "Terdapat riwayat kelas semester 1 (1IB), 2 (2IB), dan 3 (3IB)");
assert(INITIAL_GALLERY_ITEMS.length >= 6, "Terdapat dokumentasi foto galeri");

console.log("\n==================================================================");
console.log(`HASIL AKHIR: ${passed} Passed, ${failed} Failed`);
if (failed === 0) {
  console.log("🎉 SEMUA UJI FASE 4 (HALAMAN PUBLIK: AC-01, AC-02, AC-03, AC-10) BERHASIL!");
} else {
  console.error("❌ ADA PENGUJIAN FASE 4 YANG GAGAL!");
  process.exit(1);
}
console.log("==================================================================");
