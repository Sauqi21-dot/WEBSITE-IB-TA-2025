"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image_path: string;
  semester: number;
  category: string;
  taken_on: string;
}

interface ClassHistory {
  id: string;
  semester: number;
  class_name: string;
  period: string;
  summary: string;
  highlights?: string[];
}

export default function GaleriPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<ClassHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"galeri" | "riwayat">("galeri");
  const [semesterFilter, setSemesterFilter] = useState<number | "all">("all");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  useEffect(() => {
    async function fetchGalleryData() {
      try {
        const res = await fetch("/api/public/gallery");
        const json = await res.json();
        if (json.gallery) setGallery(json.gallery);
        if (json.history) setHistory(json.history);
      } catch (err) {
        console.error("Gagal memuat galeri:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGalleryData();
  }, []);

  const filteredGallery = gallery.filter((item) => {
    if (semesterFilter === "all") return true;
    return item.semester === semesterFilter;
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header Galeri & Riwayat */}
        <div className="border-b border-ib-border pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-ib-action">
                Dokumentasi &amp; Jejak Langkah
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-ib-dark mt-1">
                Galeri &amp; Riwayat Perjalanan Kelas
              </h1>
              <p className="text-sm text-ib-text/75 mt-1">
                Arsip visual kebersamaan 24 mahasiswa dari Semester 1 (1IB), Semester 2 (2IB), hingga Semester 3 (3IB).
              </p>
            </div>

            {/* Tab Navigasi: Galeri Foto vs Lini Masa */}
            <div className="flex items-center gap-2 bg-white border border-ib-border p-1 rounded text-xs self-start md:self-auto">
              <button
                onClick={() => setActiveTab("galeri")}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  activeTab === "galeri"
                    ? "bg-ib-dark text-white"
                    : "text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Galeri Foto
              </button>
              <button
                onClick={() => setActiveTab("riwayat")}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  activeTab === "riwayat"
                    ? "bg-ib-dark text-white"
                    : "text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Lini Masa Per Semester
              </button>
            </div>
          </div>

          {activeTab === "galeri" && (
            <div className="mt-6 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setSemesterFilter("all")}
                className={`px-3 py-1.5 rounded font-semibold border transition ${
                  semesterFilter === "all"
                    ? "bg-ib-dark text-white border-ib-dark"
                    : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Semua Semester {loading ? "(memuat…)" : `(${gallery.length})`}
              </button>
              <button
                onClick={() => setSemesterFilter(1)}
                className={`px-3 py-1.5 rounded font-semibold border transition ${
                  semesterFilter === 1
                    ? "bg-ib-dark text-white border-ib-dark"
                    : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Semester 1 (1IB)
              </button>
              <button
                onClick={() => setSemesterFilter(2)}
                className={`px-3 py-1.5 rounded font-semibold border transition ${
                  semesterFilter === 2
                    ? "bg-ib-dark text-white border-ib-dark"
                    : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Semester 2 (2IB)
              </button>
              <button
                onClick={() => setSemesterFilter(3)}
                className={`px-3 py-1.5 rounded font-semibold border transition ${
                  semesterFilter === 3
                    ? "bg-ib-dark text-white border-ib-dark"
                    : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                }`}
              >
                Semester 3 (3IB)
              </button>
            </div>
          )}
        </div>

        {/* Konten Tab 1: Galeri Foto */}
        {activeTab === "galeri" && (
          <div>
            {loading ? (
              <div className="space-y-4">
                <p className="text-xs text-ib-text/60 italic animate-pulse">Memuat galeri dokumentasi...</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white border border-ib-border p-4 rounded h-64 animate-pulse space-y-3">
                      <div className="aspect-video bg-ib-border/40 rounded" />
                      <div className="h-4 bg-ib-border/50 rounded w-3/4" />
                      <div className="h-3 bg-ib-border/30 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredGallery.length === 0 ? (
              <div className="bg-white border border-ib-border p-12 text-center rounded">
                <p className="text-sm text-ib-text/70">Belum ada foto untuk semester yang dipilih.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredGallery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPhoto(item)}
                    className="bg-white border border-ib-border rounded overflow-hidden shadow-sm hover:border-ib-dark/60 transition cursor-pointer flex flex-col"
                  >
                    <div className="aspect-video bg-ib-dark/10 relative overflow-hidden flex items-center justify-center border-b border-ib-border">
                      <img
                        src={item.image_path}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                      />
                      <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-black/60 text-white rounded backdrop-blur-sm">
                        Semester {item.semester}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-ib-action">
                          {item.category}
                        </span>
                        <h3 className="font-serif font-bold text-base text-ib-dark leading-snug mt-0.5">
                          {item.title}
                        </h3>
                        <p className="text-xs text-ib-text/75 mt-1 line-clamp-2">
                          {item.caption}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-ib-border/60 text-[11px] text-ib-text/60">
                        {new Date(item.taken_on).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Konten Tab 2: Lini Masa Riwayat Kelas */}
        {activeTab === "riwayat" && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-[#FAF8F2] border border-ib-border p-5 rounded text-xs text-ib-text/80">
              <p className="font-bold text-ib-dark text-sm mb-1">Perjalanan Kelas 3IB Polsri</p>
              <p>
                Dokumentasi perjalanan angkatan 2025 program studi D3 Manajemen Informatika. Dari pertama menginjakkan kaki di kampus hingga menyongsong tugas akhir dan kelulusan.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-ib-border space-y-10">
              {history.map((hist) => (
                <div key={hist.id} className="relative group">
                  {/* Dot Lini Masa */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-ib-dark group-hover:border-ib-accent transition" />

                  <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-ib-border pb-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-ib-action">
                          Semester {hist.semester}
                        </span>
                        <h3 className="font-serif text-2xl font-bold text-ib-dark">
                          Kelas {hist.class_name}
                        </h3>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 bg-[#EFECE2] text-ib-dark rounded">
                        {hist.period}
                      </span>
                    </div>

                    <p className="text-sm text-ib-text/85 leading-relaxed">
                      {hist.summary}
                    </p>

                    {hist.highlights && (
                      <div className="bg-[#FCFAF5] p-3 rounded border border-ib-border text-xs space-y-1.5">
                        <span className="font-semibold text-ib-dark block">Sorotan Utama:</span>
                        <ul className="list-disc list-inside space-y-1 text-ib-text/80">
                          {hist.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Pratinjau Foto */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-2xl w-full rounded border border-ib-border overflow-hidden shadow-2xl"
            >
              <div className="aspect-video bg-black flex items-center justify-center relative">
                <img
                  src={selectedPhoto.image_path}
                  alt={selectedPhoto.title}
                  className="max-h-[60vh] w-auto object-contain"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-3 right-3 text-white bg-black/60 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-ib-text/70">
                  <span className="font-semibold text-ib-action uppercase">{selectedPhoto.category}</span>
                  <span>Semester {selectedPhoto.semester} · {selectedPhoto.taken_on}</span>
                </div>
                <h4 className="font-serif text-xl font-bold text-ib-dark">
                  {selectedPhoto.title}
                </h4>
                <p className="text-sm text-ib-text/85">
                  {selectedPhoto.caption}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
