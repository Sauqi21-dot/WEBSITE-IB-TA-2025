"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface ScheduleItem {
  id: string;
  course_name: string;
  lecturer_name: string;
  semester: number;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  start_time: string;
  end_time: string;
  room: string;
  notes: string | null;
  changed_at: string | null;
}

const DAYS_ORDER: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat')[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
];

export default function JadwalPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("2025-10-14T08:00:00Z");
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>("Senin");
  const [todayName, setTodayName] = useState<string>("");

  useEffect(() => {
    // 1. Tentukan nama hari ini (WIB)
    const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const now = new Date();
    const currentDayName = dayMap[now.getDay()];
    setTodayName(currentDayName);
    if (DAYS_ORDER.includes(currentDayName as any)) {
      setSelectedDay(currentDayName as any);
    }

    // 2. Deteksi status jaringan online / offline (AC-03 Mode Pesawat)
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. Muat data jadwal (dengan caching ke localStorage untuk mode pesawat)
    async function loadSchedule() {
      // Coba baca dari localStorage dulu untuk ketersediaan instan
      const cached = localStorage.getItem("ib_cached_schedule");
      const cachedTime = localStorage.getItem("ib_cached_schedule_timestamp");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setSchedules(parsed);
          if (cachedTime) setLastUpdated(cachedTime);
        } catch {}
      }

      try {
        const res = await fetch("/api/public/schedules");
        const json = await res.json();
        if (json.data) {
          setSchedules(json.data);
          const updateTime = json.lastUpdated || new Date().toISOString();
          setLastUpdated(updateTime);
          localStorage.setItem("ib_cached_schedule", JSON.stringify(json.data));
          localStorage.setItem("ib_cached_schedule_timestamp", updateTime);
        }
      } catch (err) {
        // Jika offline atau error jaringan, cache localStorage tetap dipakai
        if (!cached) {
          console.warn("Gagal memuat jadwal & cache kosong:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const displayedDays = viewMode === "week" ? DAYS_ORDER : [selectedDay];

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Banner Status Mode Pesawat / Offline (AC-03) */}
        {isOffline && (
          <div className="bg-amber-100 border border-ib-accent p-3.5 rounded text-xs flex items-center justify-between text-amber-950">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />
              <p className="font-semibold">
                Sedang Dalam Mode Pesawat / Offline:
              </p>
              <span>Menampilkan jadwal terakhir yang tersimpan di perangkat Anda (hanya-baca).</span>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase">
              Offline Cache Aktif
            </span>
          </div>
        )}

        {/* Header Jadwal */}
        <div className="border-b border-ib-border pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-ib-action">
                Informasi Perkuliahan · Semester 3
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-ib-dark mt-1">
                Jadwal Kuliah Kelas 3IB
              </h1>
              <p className="text-sm text-ib-text/75 mt-1">
                D3 Manajemen Informatika Polsri · Tahun Akademik 2025/2026
              </p>
            </div>

            {/* Keterangan Terakhir Diperbarui (AC-03) */}
            <div className="text-xs bg-[#EFECE2] border border-ib-border px-3 py-2 rounded self-start md:self-auto space-y-0.5">
              <p className="text-ib-text/60 font-medium">Terakhir diperbarui:</p>
              <p className="font-semibold text-ib-dark">{formatDateTime(lastUpdated)} WIB</p>
            </div>
          </div>

          {/* Toggle View: Per Minggu / Per Hari */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white border border-ib-border p-1 rounded text-xs">
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  viewMode === "week"
                    ? "bg-ib-dark text-white"
                    : "text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Tampilan Per Minggu
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  viewMode === "day"
                    ? "bg-ib-dark text-white"
                    : "text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Tampilan Per Hari
              </button>
            </div>

            {viewMode === "day" && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {DAYS_ORDER.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`px-3 py-1.5 rounded font-semibold border transition ${
                      selectedDay === d
                        ? "bg-ib-action text-white border-ib-action"
                        : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                    }`}
                  >
                    {d}
                    {todayName === d && " (Hari Ini)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daftar Jadwal */}
        {loading && schedules.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-ib-border p-6 rounded animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {displayedDays.map((day) => {
              const daySchedules = schedules.filter((s) => s.day === day);
              const isCurrentDay = todayName === day;

              return (
                <div
                  key={day}
                  className={`bg-white border rounded shadow-sm overflow-hidden ${
                    isCurrentDay ? "border-ib-accent ring-1 ring-ib-accent" : "border-ib-border"
                  }`}
                >
                  {/* Header Hari */}
                  <div
                    className={`px-6 py-3 flex items-center justify-between border-b ${
                      isCurrentDay
                        ? "bg-[#FEF9ED] border-amber-200"
                        : "bg-[#F7F5EF] border-ib-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="font-serif text-xl font-bold text-ib-dark">
                        {day}
                      </h2>
                      {isCurrentDay && (
                        <span className="text-xs uppercase font-bold px-2 py-0.5 bg-ib-accent text-white rounded">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ib-text/60 font-semibold">
                      {daySchedules.length} Mata Kuliah
                    </span>
                  </div>

                  {/* Isi Jadwal Per Jam */}
                  {daySchedules.length === 0 ? (
                    <div className="p-6 text-xs text-ib-text/60 text-center italic">
                      Tidak ada perkuliahan pada hari ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-ib-border/70">
                      {daySchedules.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FCFAF5] transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-ib-dark bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.start_time} - {item.end_time} WIB
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-[#EFECE2] text-ib-text rounded">
                                {item.room}
                              </span>
                              {item.changed_at && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                  Diubah: {new Date(item.changed_at).toLocaleDateString("id-ID")}
                                </span>
                              )}
                            </div>
                            <h3 className="font-serif text-lg font-bold text-ib-dark">
                              {item.course_name}
                            </h3>
                            <p className="text-xs text-ib-text/80">
                              Dosen Pengampu: <span className="font-semibold">{item.lecturer_name}</span>
                            </p>
                          </div>

                          {item.notes && (
                            <div className="md:max-w-xs text-xs bg-[#FAF8F2] border border-ib-border p-3 rounded">
                              <span className="font-semibold text-ib-dark block mb-0.5">Catatan:</span>
                              <p className="text-ib-text/80 italic">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
