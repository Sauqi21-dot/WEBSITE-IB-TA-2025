"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicStudent } from "@/types/database";

export default function MahasiswaPage() {
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pengurus" | "mahasiswa">("all");

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch("/api/public/students");
        const json = await res.json();
        if (json.data) {
          setStudents(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat direktori:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase())) ||
      (s.position && s.position.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === "pengurus") {
      return Boolean(s.position);
    }
    if (filter === "mahasiswa") {
      return !s.position;
    }
    return true;
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Direktori */}
        <div className="border-b border-ib-border pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-ib-action">
                Direktori Kelas
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-ib-dark mt-1">
                Daftar Mahasiswa IB 2025
              </h1>
              <p className="text-sm text-ib-text/75 mt-1">
                24 kawan sekelas D3 Manajemen Informatika Polsri yang berjuang bersama sejak semester 1 hingga wisuda.
              </p>
            </div>
            <div className="text-xs text-ib-text/60 bg-[#EFECE2] px-3 py-1.5 rounded border border-ib-border self-start md:self-auto">
              Privasi Terjaga: Data kontak pribadi tidak dipublikasikan
            </div>
          </div>

          {/* Bar Pencarian & Filter */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, panggilan, atau jabatan..."
                className="w-full px-3 py-2 pl-9 text-sm border border-ib-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-ib-dark/40"
              />
              <svg
                className="w-4 h-4 text-ib-text/50 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded transition ${
                  filter === "all"
                    ? "bg-ib-dark text-white font-semibold"
                    : "bg-white border border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Semua {loading ? "(memuat…)" : `(${students.length})`}
              </button>
              <button
                onClick={() => setFilter("pengurus")}
                className={`px-3 py-1.5 rounded transition ${
                  filter === "pengurus"
                    ? "bg-ib-dark text-white font-semibold"
                    : "bg-white border border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Pengurus {loading ? "(memuat…)" : "(4)"}
              </button>
              <button
                onClick={() => setFilter("mahasiswa")}
                className={`px-3 py-1.5 rounded transition ${
                  filter === "mahasiswa"
                    ? "bg-ib-dark text-white font-semibold"
                    : "bg-white border border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Mahasiswa {loading ? "(memuat…)" : "(20)"}
              </button>
            </div>
          </div>
        </div>

        {/* Grid Kartu Mahasiswa */}
        {loading ? (
          <div className="space-y-4">
            <p className="text-xs text-ib-text/60 italic animate-pulse">Memuat data direktori mahasiswa...</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-ib-border p-5 rounded animate-pulse h-48 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ib-border/60" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3 bg-ib-border/60 rounded w-3/4" />
                      <div className="h-2 bg-ib-border/40 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-ib-border/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white border border-ib-border p-12 text-center rounded">
            <p className="text-sm text-ib-text/70">Tidak ada mahasiswa yang cocok dengan pencarian "{search}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.map((student) => {
              const initials = student.full_name
                .split(" ")
                .filter((p) => p && !p.endsWith("."))
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={student.id}
                  className="bg-white border border-ib-border rounded p-5 shadow-sm hover:border-ib-dark/60 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Kartu: Foto & Jabatan */}
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-ib-dark/10 border border-ib-border flex-shrink-0 flex items-center justify-center">
                        {student.photo_public && student.photo_path ? (
                          <img
                            src={student.photo_path}
                            alt={student.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-serif font-bold text-lg text-ib-dark">
                            {initials}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {student.position && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded inline-block mb-1">
                            {student.position}
                          </span>
                        )}
                        <h2 className="font-serif font-bold text-base text-ib-dark truncate" title={student.full_name}>
                          {student.full_name}
                        </h2>
                        {student.nickname && (
                          <p className="text-xs text-ib-text/60">
                            Panggilan: <span className="font-semibold text-ib-action">{student.nickname}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio Singkat */}
                    <p className="text-xs text-ib-text/80 mt-4 leading-relaxed line-clamp-3">
                      {student.bio || "Mahasiswa D3 Manajemen Informatika Polsri."}
                    </p>
                  </div>

                  {/* Footer Kartu: Ulang Tahun (Hari & Bulan) */}
                  <div className="mt-4 pt-3 border-t border-ib-border/60 flex items-center justify-between text-[11px] text-ib-text/70">
                    <span>
                      {student.birthday_public && student.birthday_day && student.birthday_month
                        ? `Ulang Tahun: ${student.birthday_day}/${student.birthday_month}`
                        : "Ulang Tahun: Disembunyikan"}
                    </span>
                    <span className="text-ib-dark/60 font-mono text-[10px]">
                      3IB · Polsri
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
