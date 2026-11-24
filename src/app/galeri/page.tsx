"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { processGalleryImage } from "@/lib/gallery-optimizer";

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image_path: string;
  semester: number;
  category: string;
  taken_on: string;
  uploaded_by?: string | null;
  uploader?: {
    id: string;
    full_name: string;
    nickname: string | null;
  } | null;
  archived?: boolean;
}

interface ClassHistory {
  id: string;
  semester: number;
  class_name: string;
  period: string;
  summary: string;
  highlights?: string[];
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const CATEGORIES = [
  "Dokumentasi Kuliah",
  "Kegiatan Kelas",
  "Praktikum & Tugas",
  "Lomba & Prestasi",
  "Lainnya",
];

export default function GaleriPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<ClassHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"galeri" | "riwayat">("galeri");
  const [semesterFilter, setSemesterFilter] = useState<number | "all">("all");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  // Sesi pengguna login
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // State Modal Tambah Foto
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newSemester, setNewSemester] = useState("3");
  const [newCategory, setNewCategory] = useState("Dokumentasi Kuliah");
  const [newTakenOn, setNewTakenOn] = useState(new Date().toISOString().split("T")[0]);
  const [newFile, setNewFile] = useState<Blob | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // State Modal Edit Foto
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editSemester, setEditSemester] = useState("3");
  const [editCategory, setEditCategory] = useState("Dokumentasi Kuliah");
  const [editTakenOn, setEditTakenOn] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchGalleryData = async () => {
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
  };

  useEffect(() => {
    fetchGalleryData();

    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", user.id)
            .single();

          if (profile) {
            setCurrentUser(profile);
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi pengguna:", err);
      }
    }
    checkAuth();
  }, []);

  // Filter semester
  const filteredGallery = gallery.filter((item) => {
    if (semesterFilter === "all") return true;
    return item.semester === semesterFilter;
  });

  // Handler Pilih Berkas Foto Tambah
  const handleSelectNewFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddMsg(null);
    try {
      // Optimasi gambar di browser: resize maks 1600x1600, WebP, hapus EXIF
      const processed = await processGalleryImage(file);
      setNewFile(processed.blob);
      setNewPreview(processed.dataUrl);
    } catch (err: any) {
      setAddMsg({ type: "error", text: err.message || "Gagal memproses gambar." });
    }
  };

  // Handler Kirim Foto Baru
  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) {
      setAddMsg({ type: "error", text: "Silakan pilih berkas foto terlebih dahulu." });
      return;
    }
    if (!newTitle.trim()) {
      setAddMsg({ type: "error", text: "Judul foto wajib diisi." });
      return;
    }

    setSubmittingAdd(true);
    setAddMsg(null);
    try {
      const form = new FormData();
      form.append("file", new File([newFile], `gallery-${Date.now()}.webp`, { type: "image/webp" }));
      form.append("title", newTitle.trim());
      form.append("caption", newCaption.trim());
      form.append("semester", newSemester);
      form.append("category", newCategory);
      form.append("taken_on", newTakenOn);

      const res = await fetch("/api/gallery", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengunggah foto.");

      setAddMsg({ type: "success", text: "Foto berhasil diunggah ke galeri!" });
      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewFile(null);
        setNewPreview(null);
        setNewTitle("");
        setNewCaption("");
        setAddMsg(null);
        fetchGalleryData();
      }, 700);
    } catch (err: any) {
      setAddMsg({ type: "error", text: err.message || "Gagal mengunggah foto." });
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Handler Buka Modal Edit Foto
  const handleOpenEdit = (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditCaption(item.caption || "");
    setEditSemester(String(item.semester || 3));
    setEditCategory(item.category || "Dokumentasi Kuliah");
    setEditTakenOn(item.taken_on || new Date().toISOString().split("T")[0]);
    setEditMsg(null);
  };

  // Handler Simpan Edit Foto
  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmittingEdit(true);
    setEditMsg(null);

    try {
      const res = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          title: editTitle.trim(),
          caption: editCaption.trim(),
          semester: parseInt(editSemester, 10),
          category: editCategory,
          taken_on: editTakenOn,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui informasi foto.");

      setEditMsg({ type: "success", text: "Perubahan foto berhasil disimpan." });
      setTimeout(() => {
        setEditingItem(null);
        fetchGalleryData();
      }, 700);
    } catch (err: any) {
      setEditMsg({ type: "error", text: err.message || "Gagal memperbarui foto." });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handler Arsipkan Foto (Menyembunyikan foto, bukan menghapus)
  const handleArchivePhoto = async (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Apakah Anda yakin ingin mengarsipkan foto "${item.title}"?\nFoto ini akan disembunyikan dari galeri publik.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, archived: true }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengarsipkan foto.");

      await fetchGalleryData();
    } catch (err: any) {
      alert(err.message || "Gagal mengarsipkan foto.");
    }
  };

  // Handler Hapus Permanen (Hanya Admin & Super Admin)
  const handleDeletePermanent = async (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Hapus permanen foto "${item.title}"?\nTindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/gallery?id=${item.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus foto.");

      await fetchGalleryData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus foto.");
    }
  };

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
                Arsip visual kebersamaan mahasiswa Manajemen Informatika.
              </p>
            </div>

            {/* Aksi Tambah Foto & Tab Navigasi */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              {currentUser && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 rounded font-semibold text-xs bg-ib-action text-white hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
                >
                  <span>+</span> Tambah Foto
                </button>
              )}

              {/* Tab Navigasi: Galeri Foto vs Lini Masa */}
              <div className="flex items-center gap-1 bg-white border border-ib-border p-1 rounded text-xs">
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
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSemesterFilter(sem)}
                  className={`px-3 py-1.5 rounded font-semibold border transition ${
                    semesterFilter === sem
                      ? "bg-ib-dark text-white border-ib-dark"
                      : "bg-white border-ib-border text-ib-text hover:bg-[#EFECE2]"
                  }`}
                >
                  Semester {sem}
                </button>
              ))}
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
                {currentUser && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 text-xs text-ib-action font-semibold hover:underline"
                  >
                    + Unggah foto pertama untuk semester ini
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredGallery.map((item) => {
                  const uploaderName =
                    item.uploader?.full_name || item.uploader?.nickname || "Anggota Kelas";
                  const isAdmin =
                    currentUser?.role === "admin" || currentUser?.role === "super_admin";
                  const isOwner = currentUser?.id === item.uploaded_by;
                  const canManage = Boolean(currentUser && (isAdmin || isOwner));

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPhoto(item)}
                      className="bg-white border border-ib-border rounded overflow-hidden shadow-sm hover:border-ib-dark/60 transition cursor-pointer flex flex-col group"
                    >
                      <div className="aspect-video bg-ib-dark/10 relative overflow-hidden flex items-center justify-center border-b border-ib-border">
                        <img
                          src={item.image_path}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-black/60 text-white rounded backdrop-blur-sm">
                          Semester {item.semester}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-ib-action font-bold uppercase tracking-wider">
                            <span>{item.category}</span>
                            <span className="text-ib-text/50 font-normal normal-case">
                              Oleh: <strong className="font-semibold text-ib-dark/80">{uploaderName}</strong>
                            </span>
                          </div>

                          <h3 className="font-serif font-bold text-base text-ib-dark leading-snug mt-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-ib-text/75 mt-1 line-clamp-2">
                            {item.caption || "Tidak ada keterangan."}
                          </p>
                        </div>

                        {/* Tanggal & Aksi Kelola Foto */}
                        <div className="pt-2 border-t border-ib-border/60 flex items-center justify-between text-[11px] text-ib-text/60">
                          <span>
                            {new Date(item.taken_on).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>

                          {canManage && (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleOpenEdit(item, e)}
                                className="px-2 py-0.5 bg-[#FAF8F2] border border-ib-border rounded hover:bg-white text-ib-dark font-medium transition"
                                title="Edit informasi foto"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleArchivePhoto(item, e)}
                                className="px-2 py-0.5 bg-[#FAF8F2] border border-ib-border rounded hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-ib-text font-medium transition"
                                title="Sembunyikan foto dari galeri publik"
                              >
                                Arsipkan
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={(e) => handleDeletePermanent(item, e)}
                                  className="px-2 py-0.5 bg-[#FAF8F2] border border-ib-border rounded hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-rose-600 font-medium transition"
                                  title="Hapus foto permanen (Admin)"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Konten Tab 2: Lini Masa Riwayat Kelas */}
        {activeTab === "riwayat" && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-[#FAF8F2] border border-ib-border p-5 rounded text-xs text-ib-text/80">
              <p className="font-bold text-ib-dark text-sm mb-1">Perjalanan Kelas Polsri</p>
              <p>
                Dokumentasi perjalanan angkatan program studi D3 Manajemen Informatika. Dari pertama menginjakkan kaki di kampus hingga menyongsong tugas akhir dan kelulusan.
              </p>
            </div>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-ib-border space-y-10">
              {history.map((hist) => (
                <div key={hist.id} className="relative group">
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
                      {hist.summary && hist.summary.trim() ? hist.summary : "Belum ada catatan"}
                    </p>

                    {hist.highlights && hist.highlights.length > 0 && (
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
                  className="absolute top-3 right-3 text-white bg-black/60 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition"
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
                  {selectedPhoto.caption || "Tidak ada keterangan tambahan."}
                </p>
                <div className="pt-3 border-t border-ib-border text-[11px] text-ib-text/60">
                  Diunggah oleh:{" "}
                  <strong className="text-ib-dark">
                    {selectedPhoto.uploader?.full_name || selectedPhoto.uploader?.nickname || "Anggota Kelas"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tambah Foto */}
        {isAddModalOpen && (
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-lg w-full rounded border border-ib-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-ib-border pb-3">
                <h3 className="font-serif text-xl font-bold text-ib-dark">Tambah Foto ke Galeri</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-ib-text/60 hover:text-ib-dark font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              {addMsg && (
                <div
                  className={`p-3 rounded text-xs ${
                    addMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {addMsg.text}
                </div>
              )}

              <form onSubmit={handleAddPhotoSubmit} className="space-y-4 text-xs">
                {/* File Upload & Preview */}
                <div>
                  <label className="block font-semibold text-ib-dark mb-1">
                    Pilih Foto (JPG, PNG, atau WebP, maks 5 MB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSelectNewFile}
                    className="w-full text-xs text-ib-text file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#EFECE2] file:text-ib-dark hover:file:bg-ib-border transition cursor-pointer"
                  />
                  {newPreview && (
                    <div className="mt-3 aspect-video bg-ib-border/20 rounded overflow-hidden border border-ib-border max-h-48 flex items-center justify-center">
                      <img src={newPreview} alt="Pratinjau" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-ib-dark mb-1">
                    Judul Foto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Praktikum Pemrograman Web"
                    className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ib-dark mb-1">Keterangan / Cerita</label>
                  <textarea
                    rows={3}
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder="Tuliskan cerita singkat atau suasana foto..."
                    className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Semester</label>
                    <select
                      value={newSemester}
                      onChange={(e) => setNewSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs bg-white focus:outline-none focus:border-ib-dark"
                    >
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs bg-white focus:outline-none focus:border-ib-dark"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={newTakenOn}
                      onChange={(e) => setNewTakenOn(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-ib-border">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-ib-border rounded text-xs font-semibold text-ib-text hover:bg-[#FAF8F2] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="px-4 py-2 bg-ib-action hover:bg-emerald-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                  >
                    {submittingAdd ? "Mengunggah & Memproses..." : "Unggah Foto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Foto */}
        {editingItem && (
          <div
            onClick={() => setEditingItem(null)}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-lg w-full rounded border border-ib-border p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-ib-border pb-3">
                <h3 className="font-serif text-xl font-bold text-ib-dark">Edit Informasi Foto</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-ib-text/60 hover:text-ib-dark font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              {editMsg && (
                <div
                  className={`p-3 rounded text-xs ${
                    editMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {editMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveEditSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ib-dark mb-1">
                    Judul Foto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ib-dark mb-1">Keterangan / Cerita</label>
                  <textarea
                    rows={3}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Semester</label>
                    <select
                      value={editSemester}
                      onChange={(e) => setEditSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs bg-white focus:outline-none focus:border-ib-dark"
                    >
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Kategori</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs bg-white focus:outline-none focus:border-ib-dark"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ib-dark mb-1">Tanggal Kegiatan</label>
                    <input
                      type="date"
                      value={editTakenOn}
                      onChange={(e) => setEditTakenOn(e.target.value)}
                      className="w-full px-3 py-2 border border-ib-border rounded text-xs focus:outline-none focus:border-ib-dark"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-ib-border">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 border border-ib-border rounded text-xs font-semibold text-ib-text hover:bg-[#FAF8F2] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-4 py-2 bg-ib-action hover:bg-emerald-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                  >
                    {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
