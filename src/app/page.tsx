"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

interface ScheduleItem {
  id: string;
  course_name: string;
  lecturer_name: string;
  start_time: string;
  end_time: string;
  room: string;
  day: string;
}

interface BirthdayPerson {
  id: string;
  full_name: string;
  nickname: string | null;
  birthday_day: number;
  birthday_month: number;
  daysUntil: number;
  isToday: boolean;
}

interface FeaturedPhoto {
  id: string;
  title: string;
  image_path: string;
}

export default function HomePage() {
  const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
  const [todayDayName, setTodayDayName] = useState<string>("");
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayPerson[]>([]);
  const [featuredPhoto, setFeaturedPhoto] = useState<FeaturedPhoto | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const now = new Date();
    const currentDay = dayMap[now.getDay()];
    setTodayDayName(currentDay);

    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
        }
      } catch {}
    }

    async function loadHomepageData() {
      try {
        const [schRes, bdayRes, galRes] = await Promise.all([
          fetch("/api/public/schedules").then((r) => r.json()).catch(() => ({})),
          fetch("/api/public/birthdays").then((r) => r.json()).catch(() => ({})),
          fetch("/api/public/gallery").then((r) => r.json()).catch(() => ({})),
        ]);

        if (schRes.data) {
          const todays = schRes.data.filter((s: any) => s.day === currentDay);
          setTodaySchedules(todays);
        }

        if (bdayRes.today || bdayRes.next7Days) {
          const list = [...(bdayRes.today || []), ...(bdayRes.next7Days || [])];
          setUpcomingBirthdays(list.slice(0, 3));
        }

        if (galRes.featuredPhoto) {
          setFeaturedPhoto(galRes.featuredPhoto);
        }
      } catch (err) {
        console.error("Gagal memuat pratinjau beranda:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
    loadHomepageData();
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-10">
        {/* Editorial Masthead / Header Section */}
        <section className="border-b border-ib-border pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl md:text-6xl font-bold text-ib-dark tracking-tight mt-1">
                IB 2025
              </h1>
              <p className="font-serif italic text-lg md:text-xl text-ib-text/80 mt-1">
                &ldquo;IB JOSJIS&rdquo; &mdash; Wadah kebersamaan dan arsip perjalanan 24 mahasiswa dari semester 1 hingga kelulusan.
              </p>
            </div>
            <div className="text-xs md:text-right text-ib-text/70 border-t md:border-t-0 md:border-l border-ib-border pt-3 md:pt-0 md:pl-6 flex-shrink-0">
              <p className="font-semibold text-ib-dark">D3 Manajemen Informatika</p>
              <p>Politeknik Negeri Sriwijaya</p>
              <p className="mt-1 text-ib-accent font-semibold">Semester 3 &middot; Tahun Akademik 2026/2027</p>
            </div>
          </div>
        </section>

        {/* Highlight Berita & Pengurus Kelas */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Kolom Utama (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            {/* Foto Pilihan Kelas (Hanya tampil jika ada is_featured di database, tanpa placeholder) */}
            <div className="bg-white border border-ib-border rounded overflow-hidden shadow-sm">
              {featuredPhoto && (
                <div className="aspect-[21/9] bg-ib-dark/10 relative overflow-hidden flex items-center justify-center border-b border-ib-border">
                  <img
                    src={featuredPhoto.image_path}
                    alt={featuredPhoto.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1 rounded backdrop-blur-sm">
                    {featuredPhoto.title}
                  </div>
                </div>
              )}
              <div className="p-6">
                <h2 className="font-serif text-2xl font-bold text-ib-dark leading-snug">
                  Kenapa website ini ada
                </h2>
                <p className="text-sm text-ib-text/85 mt-3 leading-relaxed">
                  Jadwal sering tenggelam di grup chat, foto kenangan tersebar di galeri masing-masing. Jadi kami kumpulkan di sini. Jadwal, mahasiswa, galeri, dan ulang tahun bisa dilihat siapa saja. Login dipakai untuk profil.
                </p>
                <div className="mt-5 pt-4 border-t border-ib-border flex flex-wrap items-center gap-3 text-xs">
                  <Link href="/jadwal" className="btn-secondary py-1.5 px-3">
                    Buka Jadwal Kuliah &rarr;
                  </Link>
                  <Link href="/mahasiswa" className="btn-secondary py-1.5 px-3">
                    Lihat 24 Rekan Kelas &rarr;
                  </Link>
                  <Link href="/galeri" className="btn-secondary py-1.5 px-3">
                    Buka Galeri Foto &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Struktur Organisasi Inti */}
            <div className="bg-[#FCFAF5] border border-ib-border p-6 rounded">
              <div className="border-b border-ib-border pb-2 mb-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-ib-dark">
                  Profil Kelas &amp; Struktur Organisasi
                </span>
                <h3 className="font-serif text-xl font-bold text-ib-dark mt-0.5">
                  Pengurus Kelas 3IB
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-ib-border rounded space-y-1">
                  <span className="text-[11px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    Ketua Kelas (Admin)
                  </span>
                  <p className="font-semibold text-ib-dark text-sm mt-1">M. Zidal Muttaqin</p>
                  <p className="text-xs text-ib-text/75 leading-relaxed">
                    Koordinator kelas dan mengaktifkan akun.
                  </p>
                </div>

                <div className="p-4 bg-white border border-ib-border rounded space-y-1">
                  <span className="text-[11px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    Wakil Ketua (Super Admin)
                  </span>
                  <p className="font-semibold text-ib-dark text-sm mt-1">Ahmad Sauqi Efriansyah</p>
                  <p className="text-xs text-ib-text/75 leading-relaxed">
                    Mengurus jadwal dan konten website.
                  </p>
                </div>

                <div className="p-4 bg-white border border-ib-border rounded space-y-1">
                  <span className="text-[11px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    Sekretaris (Admin)
                  </span>
                  <p className="font-semibold text-ib-dark text-sm mt-1">Putri Alika Sari</p>
                  <p className="text-xs text-ib-text/75 leading-relaxed">
                    Mengurus galeri foto dan riwayat kelas.
                  </p>
                </div>

                <div className="p-4 bg-white border border-ib-border rounded space-y-1">
                  <span className="text-[11px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    Bendahara (Admin)
                  </span>
                  <p className="font-semibold text-ib-dark text-sm mt-1">Salsabila Julia Mecca</p>
                  <p className="text-xs text-ib-text/75 leading-relaxed">
                    Pengurus administrasi dan keuangan kelas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Samping / Sidebar Editorial (4 cols) */}
          <aside className="md:col-span-4 space-y-6">
            {/* Pratinjau Jadwal Hari Ini */}
            <div className="bg-white border border-ib-border p-5 rounded shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ib-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ib-dark">
                  Jadwal Kuliah Hari Ini
                </span>
                <span className="text-xs font-semibold text-ib-accent bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {todayDayName}
                </span>
              </div>

              {loading ? (
                <div className="p-4 bg-[#FCFAF5] rounded animate-pulse text-xs text-ib-text/60 italic">
                  Memuat jadwal hari ini...
                </div>
              ) : todaySchedules.length === 0 ? (
                <p className="text-xs text-ib-text/60 italic py-2">
                  Tidak ada jadwal kuliah untuk hari {todayDayName}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {todaySchedules.map((s) => (
                    <div key={s.id} className="p-3 bg-[#FCFAF5] border border-ib-border rounded text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="font-mono font-bold text-ib-action">
                          {s.start_time} - {s.end_time}
                        </span>
                        <span className="text-[11px] text-ib-text/70">{s.room}</span>
                      </div>
                      <p className="font-semibold text-ib-dark mt-1">{s.course_name}</p>
                      <p className="text-[11px] text-ib-text/60">{s.lecturer_name}</p>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/jadwal"
                className="text-xs text-ib-action font-semibold hover:underline block pt-1"
              >
                Lihat Jadwal Lengkap (Tersedia Offline) &rarr;
              </Link>
            </div>

            {/* Pratinjau Ulang Tahun Terdekat */}
            <div className="bg-white border border-ib-border p-5 rounded shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ib-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ib-dark">
                  Ulang Tahun Terdekat
                </span>
                <span className="text-xs text-ib-text/60">WIB</span>
              </div>

              {loading ? (
                <div className="p-4 bg-[#FCFAF5] rounded animate-pulse text-xs text-ib-text/60 italic">
                  Memuat ulang tahun terdekat...
                </div>
              ) : upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-ib-text/60 italic py-2">
                  Tidak ada ulang tahun dalam 7 hari ke depan.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map((b) => (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                        b.isToday
                          ? "bg-amber-50 border-amber-300 font-semibold"
                          : "bg-[#FCFAF5] border-ib-border"
                      }`}
                    >
                      <div>
                        <p className="text-ib-dark">
                          {b.nickname || b.full_name}
                        </p>
                        <p className="text-[10px] text-ib-text/60">
                          {b.birthday_day}/{b.birthday_month}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          b.isToday
                            ? "bg-amber-200 text-amber-900"
                            : "bg-emerald-50 text-ib-action border border-emerald-200"
                        }`}
                      >
                        {b.isToday ? "Hari Ini!" : `${b.daysUntil} hari lagi`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/ulang-tahun"
                className="text-xs text-ib-action font-semibold hover:underline block pt-1"
              >
                Lihat Kalender Ulang Tahun &rarr;
              </Link>
            </div>

            {/* Item 3: Sembunyikan blok login selama sesi aktif */}
            {!isLoggedIn && (
              <div className="bg-[#FAF8F2] border border-ib-border p-4 rounded text-xs space-y-2">
                <p className="font-bold text-ib-dark uppercase tracking-wider text-[11px]">
                  Akses Mahasiswa
                </p>
                <p className="text-ib-text/80 leading-relaxed">
                  Login dengan NPM untuk mengelola profil mahasiswa.
                </p>
                <Link href="/login" className="btn-primary text-xs py-2 w-full block text-center mt-2">
                  Masuk dengan NPM &rarr;
                </Link>
              </div>
            )}
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}
