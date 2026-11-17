"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface BirthdayPerson {
  id: string;
  full_name: string;
  nickname: string | null;
  photo_path: string | null;
  birthday_day: number;
  birthday_month: number;
  daysUntil: number;
  isToday: boolean;
  isNext7Days: boolean;
}

interface MonthGroup {
  month: number;
  monthName: string;
  count: number;
  members: BirthdayPerson[];
}

export default function UlangTahunPage() {
  const [todayList, setTodayList] = useState<BirthdayPerson[]>([]);
  const [next7DaysList, setNext7DaysList] = useState<BirthdayPerson[]>([]);
  const [calendar, setCalendar] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const res = await fetch("/api/public/birthdays");
        const json = await res.json();
        if (json.today) setTodayList(json.today);
        if (json.next7Days) setNext7DaysList(json.next7Days);
        if (json.calendar) setCalendar(json.calendar);
      } catch (err) {
        console.error("Gagal memuat ulang tahun:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBirthdays();
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-10">
        {/* Header Ulang Tahun */}
        <div className="border-b border-ib-border pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-ib-action">
                Momen Spesial Kawan Sekelas
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-ib-dark mt-1">
                Kalender Ulang Tahun Kelas 3IB
              </h1>
              <p className="text-sm text-ib-text/75 mt-1">
                Pengingat hari istimewa 24 kawan sekelas. Menggunakan zona waktu WIB (Asia/Jakarta).
              </p>
            </div>
            <div className="text-xs bg-[#EFECE2] border border-ib-border px-3 py-2 rounded self-start md:self-auto text-ib-text/80">
              <p className="font-semibold text-ib-dark">Kebijakan Privasi:</p>
              <p>Tahun lahir tidak disimpan. Mahasiswa dapat mematikan tampilannya kapan saja.</p>
            </div>
          </div>
        </div>

        {/* Section 1: Hari Ini & 7 Hari Ke Depan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Ulang Tahun Hari Ini */}
          <div className="bg-white border-2 border-ib-accent rounded p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-ib-accent" />
                <h2 className="font-serif text-xl font-bold text-ib-dark">
                  Berulang Tahun Hari Ini
                </h2>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                WIB
              </span>
            </div>

            {loading ? (
              <div className="p-4 bg-[#FCFAF5] rounded animate-pulse h-24 flex items-center justify-center text-xs text-ib-text/60">
                Memuat data hari ini...
              </div>
            ) : todayList.length === 0 ? (
              <div className="py-6 text-center text-xs text-ib-text/60 italic">
                Tidak ada kawan sekelas yang berulang tahun hari ini.
              </div>
            ) : (
              <div className="space-y-3">
                {todayList.map((person) => (
                  <div
                    key={person.id}
                    className="p-4 bg-amber-50/70 border border-amber-200 rounded flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-ib-dark/10 border border-ib-accent flex-shrink-0 flex items-center justify-center">
                        {person.photo_path ? (
                          <img
                            src={person.photo_path}
                            alt={person.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-serif font-bold text-ib-dark">
                            {person.full_name.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-ib-dark">
                          {person.full_name}
                        </h3>
                        {person.nickname && (
                          <p className="text-xs text-ib-action font-semibold">
                            {person.nickname}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded">
                      Hari Ini! 🎉
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7 Hari Ke Depan */}
          <div className="bg-white border border-ib-border rounded p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-ib-border pb-3">
              <h2 className="font-serif text-xl font-bold text-ib-dark">
                Mendekat dalam 7 Hari ke Depan
              </h2>
              <span className="text-xs text-ib-text/60 font-semibold">
                {loading ? "(memuat…)" : `${next7DaysList.length} Mahasiswa`}
              </span>
            </div>

            {loading ? (
              <div className="p-4 bg-[#FCFAF5] rounded animate-pulse h-24 flex items-center justify-center text-xs text-ib-text/60">
                Memuat daftar 7 hari ke depan...
              </div>
            ) : next7DaysList.length === 0 ? (
              <div className="py-6 text-center text-xs text-ib-text/60 italic">
                Tidak ada ulang tahun dalam 7 hari ke depan.
              </div>
            ) : (
              <div className="space-y-2.5">
                {next7DaysList.map((person) => (
                  <div
                    key={person.id}
                    className="p-3 bg-[#FCFAF5] border border-ib-border rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ib-dark">
                        {person.full_name} {person.nickname ? `(${person.nickname})` : ""}
                      </p>
                      <p className="text-[11px] text-ib-text/60">
                        Tanggal: {person.birthday_day}/{person.birthday_month}
                      </p>
                    </div>
                    <span className="font-semibold text-ib-action bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      {person.daysUntil} hari lagi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Kalender Setahun Penuh (12 Bulan) */}
        <div className="space-y-4">
          <div className="border-b border-ib-border pb-3">
            <h2 className="font-serif text-2xl font-bold text-ib-dark">
              Kalender Setahun Kelas (Januari - Desember)
            </h2>
            <p className="text-xs text-ib-text/70 mt-0.5">
              Daftar seluruh kawan kelas yang mengaktifkan penampilannya di kalender publik.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {calendar.map((col) => (
              <div
                key={col.month}
                className="bg-white border border-ib-border rounded p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-ib-border/60 pb-2">
                  <h3 className="font-serif font-bold text-base text-ib-dark">
                    {col.monthName}
                  </h3>
                  <span className="text-[11px] font-semibold text-ib-text/60 bg-[#EFECE2] px-2 py-0.5 rounded">
                    {loading ? "memuat…" : `${col.count} Teman`}
                  </span>
                </div>

                {loading ? (
                  <div className="h-10 bg-[#FCFAF5] rounded animate-pulse" />
                ) : col.members.length === 0 ? (
                  <p className="text-xs text-ib-text/40 italic py-2">
                    Tidak ada ulang tahun bulan ini.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {col.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between py-1 border-b border-ib-border/40 last:border-0"
                      >
                        <span className="font-semibold text-ib-dark truncate mr-2" title={m.full_name}>
                          {m.nickname || m.full_name}
                        </span>
                        <span className="text-[11px] font-mono text-ib-action bg-[#FAF8F2] px-1.5 py-0.5 rounded border border-ib-border flex-shrink-0">
                          Tgl {m.birthday_day}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
