"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { processGalleryImage } from "@/lib/gallery-optimizer";
import { Profile } from "@/types/database";

type AdminTab = "jadwal" | "galeri" | "mahasiswa" | "kas" | "akun" | "logs";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("jadwal");

  // State Jadwal
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [schedDay, setSchedDay] = useState("Senin");
  const [schedStartTime, setSchedStartTime] = useState("08:00");
  const [schedEndTime, setSchedEndTime] = useState("10:00");
  const [schedRoom, setSchedRoom] = useState("");
  const [schedSemester, setSchedSemester] = useState("3");
  const [schedNotes, setSchedNotes] = useState("");
  const [schedMsg, setSchedMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State Edit Jadwal
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editLecturerName, setEditLecturerName] = useState("");
  const [editSchedDay, setEditSchedDay] = useState("Senin");
  const [editSchedStartTime, setEditSchedStartTime] = useState("08:00");
  const [editSchedEndTime, setEditSchedEndTime] = useState("10:00");
  const [editSchedRoom, setEditSchedRoom] = useState("");
  const [editSchedSemester, setEditSchedSemester] = useState("3");
  const [editSchedNotes, setEditSchedNotes] = useState("");
  const [savingSchedEdit, setSavingSchedEdit] = useState(false);
  const [editSchedMsg, setEditSchedMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State Galeri
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryFile, setGalleryFile] = useState<Blob | null>(null);
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [gallerySemester, setGallerySemester] = useState("3");
  const [galleryCategory, setGalleryCategory] = useState("Dokumentasi Kuliah");
  const [galleryTakenOn, setGalleryTakenOn] = useState(new Date().toISOString().split("T")[0]);
  const [galleryIsFeatured, setGalleryIsFeatured] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Edit Galeri
  const [editingGalleryItem, setEditingGalleryItem] = useState<any | null>(null);
  const [editGalleryFile, setEditGalleryFile] = useState<Blob | null>(null);
  const [editGalleryPreview, setEditGalleryPreview] = useState<string | null>(null);
  const [editGalleryTitle, setEditGalleryTitle] = useState("");
  const [editGalleryCaption, setEditGalleryCaption] = useState("");
  const [editGallerySemester, setEditGallerySemester] = useState("3");
  const [editGalleryCategory, setEditGalleryCategory] = useState("Dokumentasi Kuliah");
  const [editGalleryTakenOn, setEditGalleryTakenOn] = useState("");
  const [savingGalleryEdit, setSavingGalleryEdit] = useState(false);
  const [editGalleryMsg, setEditGalleryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // State Akun & Mahasiswa
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    open: boolean;
    name: string;
    nim: string;
    tempPassword: string;
  }>({ open: false, name: "", nim: "", tempPassword: "" });
  const [copied, setCopied] = useState(false);

  // State Log Aktivitas
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 1. Verifikasi Hak Akses
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login?redirect=/admin";
          return;
        }

        const res = await fetch("/api/admin/check-access");
        const json = await res.json();

        if (res.status === 401) {
          window.location.href = "/login?redirect=/admin";
          return;
        }

        setProfile(json.profile);
        setHasAccess(Boolean(json.hasAccess));
      } catch (err) {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetcher Data per Tab
  const loadSchedules = useCallback(async () => {
    setSchedLoading(true);
    try {
      const res = await fetch("/api/admin/schedules");
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.schedules || []);
      }
    } finally {
      setSchedLoading(false);
    }
  }, []);

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch("/api/admin/gallery");
      if (res.ok) {
        const json = await res.json();
        setGalleryItems(json.items || []);
      }
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/admin/accounts");
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.accounts || []);
      }
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    if (activeTab === "jadwal") loadSchedules();
    if (activeTab === "galeri") loadGallery();
    if (activeTab === "mahasiswa" || activeTab === "akun") loadAccounts();
    if (activeTab === "logs") loadLogs();
  }, [hasAccess, activeTab, loadSchedules, loadGallery, loadAccounts, loadLogs]);

  // Handler Submit Jadwal
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedMsg(null);
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: courseName,
          lecturer_name: lecturerName,
          semester: schedSemester,
          day: schedDay,
          start_time: schedStartTime,
          end_time: schedEndTime,
          room: schedRoom,
          notes: schedNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambahkan jadwal.");
      setSchedMsg({ type: "success", text: json.message });
      setCourseName("");
      setLecturerName("");
      setSchedRoom("");
      setSchedNotes("");
      loadSchedules();
    } catch (err: any) {
      setSchedMsg({ type: "error", text: err.message });
    }
  };

  const handleToggleArchiveSchedule = async (id: string, currentArchived: boolean) => {
    try {
      await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: !currentArchived }),
      });
      loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Buka Modal Edit Jadwal
  const handleOpenEditSchedule = (s: any) => {
    setEditingSchedule(s);
    setEditCourseName(s.course?.name || "");
    setEditLecturerName(s.course?.lecturer_name || "");
    setEditSchedSemester(String(s.semester || 3));
    setEditSchedDay(s.day || "Senin");
    setEditSchedStartTime(s.start_time ? s.start_time.slice(0, 5) : "08:00");
    setEditSchedEndTime(s.end_time ? s.end_time.slice(0, 5) : "10:00");
    setEditSchedRoom(s.room || "");
    setEditSchedNotes(s.notes || "");
    setEditSchedMsg(null);
  };

  // Handler Simpan Edit Jadwal
  const handleSaveScheduleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setSavingSchedEdit(true);
    setEditSchedMsg(null);
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSchedule.id,
          course_name: editCourseName,
          lecturer_name: editLecturerName,
          semester: editSchedSemester,
          day: editSchedDay,
          start_time: editSchedStartTime,
          end_time: editSchedEndTime,
          room: editSchedRoom,
          notes: editSchedNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui jadwal.");

      setEditSchedMsg({ type: "success", text: "Jadwal kuliah berhasil diperbarui." });
      setTimeout(() => {
        setEditingSchedule(null);
        loadSchedules();
      }, 800);
    } catch (err: any) {
      setEditSchedMsg({ type: "error", text: err.message });
    } finally {
      setSavingSchedEdit(false);
    }
  };

  // Handler Pilih Foto Galeri
  const handleSelectGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryMsg(null);
    try {
      // Proses via canvas: resize ke max 1600x1600, strip EXIF, convert to WebP
      const processed = await processGalleryImage(file);
      setGalleryFile(processed.blob);
      setGalleryPreview(processed.dataUrl);
    } catch (err: any) {
      setGalleryMsg({ type: "error", text: err.message || "Gagal memproses gambar." });
    }
  };

  // Handler Upload Galeri
  const handleUploadGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFile) {
      setGalleryMsg({ type: "error", text: "Pilih foto terlebih dahulu." });
      return;
    }
    setUploadingGallery(true);
    setGalleryMsg(null);
    try {
      const form = new FormData();
      form.append("file", new File([galleryFile], `gallery-${Date.now()}.webp`, { type: "image/webp" }));
      form.append("title", galleryTitle);
      form.append("caption", galleryCaption);
      form.append("semester", gallerySemester);
      form.append("category", galleryCategory);
      form.append("taken_on", galleryTakenOn);
      form.append("is_featured", String(galleryIsFeatured));

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengunggah foto.");

      setGalleryMsg({ type: "success", text: "Foto berhasil diunggah ke galeri (Format WebP tanpa EXIF)." });
      setGalleryFile(null);
      setGalleryPreview(null);
      setGalleryTitle("");
      setGalleryCaption("");
      setGalleryIsFeatured(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadGallery();
    } catch (err: any) {
      setGalleryMsg({ type: "error", text: err.message });
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleToggleFeaturedGallery = async (id: string, currentFeatured: boolean) => {
    try {
      await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_featured: !currentFeatured }),
      });
      loadGallery();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchiveGallery = async (id: string, currentArchived: boolean) => {
    try {
      await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: !currentArchived }),
      });
      loadGallery();
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Buka Modal Edit / Ganti Foto
  const handleOpenEditGallery = (item: any) => {
    setEditingGalleryItem(item);
    setEditGalleryFile(null);
    setEditGalleryPreview(item.image_path);
    setEditGalleryTitle(item.title || "");
    setEditGalleryCaption(item.caption || "");
    setEditGallerySemester(String(item.semester || 3));
    setEditGalleryCategory(item.category || "Dokumentasi Kuliah");
    setEditGalleryTakenOn(item.taken_on || new Date().toISOString().split("T")[0]);
    setEditGalleryMsg(null);
  };

  const handleSelectEditGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditGalleryMsg(null);
    try {
      const processed = await processGalleryImage(file);
      setEditGalleryFile(processed.blob);
      setEditGalleryPreview(processed.dataUrl);
    } catch (err: any) {
      setEditGalleryMsg({ type: "error", text: err.message || "Gagal memproses gambar baru." });
    }
  };

  const handleSaveGalleryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGalleryItem) return;
    setSavingGalleryEdit(true);
    setEditGalleryMsg(null);
    try {
      const form = new FormData();
      form.append("id", editingGalleryItem.id);
      form.append("title", editGalleryTitle);
      form.append("caption", editGalleryCaption);
      form.append("semester", editGallerySemester);
      form.append("category", editGalleryCategory);
      form.append("taken_on", editGalleryTakenOn);
      if (editGalleryFile) {
        form.append("file", new File([editGalleryFile], `gallery-${Date.now()}.webp`, { type: "image/webp" }));
      }

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan perubahan galeri.");

      setEditGalleryMsg({ type: "success", text: json.message || "Foto berhasil diperbarui." });
      setTimeout(() => {
        setEditingGalleryItem(null);
        loadGallery();
      }, 1000);
    } catch (err: any) {
      setEditGalleryMsg({ type: "error", text: err.message });
    } finally {
      setSavingGalleryEdit(false);
    }
  };

  // Handler Toggle Aktif Akun (Ketua)
  const handleToggleActive = async (targetId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/accounts/toggle-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetId, is_active: !currentActive }),
      });
      if (res.ok) loadAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  // Handler Reset Password (Ketua)
  const handleResetPassword = async (targetId: string, name: string, nim: string) => {
    if (!confirm(`Reset password untuk ${name} (${nim}) ke password sementara acak?`)) return;
    try {
      const res = await fetch("/api/admin/accounts/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetId }),
      });
      const json = await res.json();
      if (res.ok) {
        setTempPasswordModal({
          open: true,
          name: json.studentName,
          nim: json.studentNim,
          tempPassword: json.tempPassword,
        });
        setCopied(false);
        loadAccounts();
      } else {
        alert("Gagal reset password: " + json.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─── TAMPILAN JIKA SEDANG MEMUAT ───
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-16 text-center">
          <p className="text-sm text-ib-text/60 animate-pulse font-serif">
            Memverifikasi hak akses administratif…
          </p>
        </main>
        <Footer />
      </>
    );
  }

  // ─── TAMPILAN JIKA TIDAK PUNYA AKSES (BUKAN 404) ───
  if (!hasAccess) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center text-3xl font-bold">
            🔒
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-ib-dark">
              Akses Ditolak: Anda Tidak Memiliki Akses
            </h1>
            <p className="text-sm text-ib-text/75 leading-relaxed">
              Halaman Panel Admin khusus diperuntukkan bagi Pengurus Kelas (Ketua, Wakil, Sekretaris, dan Bendahara). Akun Anda terdaftar sebagai mahasiswa aktif.
            </p>
          </div>

          <div className="bg-white border border-ib-border p-4 rounded text-left text-xs space-y-1.5 text-ib-text/80 max-w-md mx-auto">
            <p>
              <strong className="text-ib-dark">Nama Akun:</strong> {profile?.full_name || "-"}
            </p>
            <p>
              <strong className="text-ib-dark">NPM:</strong> {profile?.nim || "-"}
            </p>
            <p>
              <strong className="text-ib-dark">Peran Saat Ini:</strong> {profile?.role || "student"} (Mahasiswa)
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/" className="btn-secondary text-xs py-2 px-4">
              Kembali ke Beranda
            </Link>
            <Link href="/profil" className="btn-primary text-xs py-2 px-4">
              Buka Profil Saya
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isKetua = profile?.role === "super_admin";
  const isBendahara = Boolean(profile?.can_manage_kas);

  // ─── TAMPILAN DASHBOARD ADMIN ───
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Header Panel Admin */}
        <div className="bg-white border border-ib-border p-6 rounded shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ib-dark text-white">
                Panel Administrasi Kelas
              </span>
              <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-[#E8E4D5] text-ib-dark">
                {profile?.role === "super_admin" ? "Ketua (Super Admin)" : `Pengurus (${profile?.position || "Admin"})`}
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-ib-dark">
              Pusat Kendali IB 2025
            </h1>
            <p className="text-xs text-ib-text/70 mt-0.5">
              Kelola jadwal kuliah, galeri kenangan, data mahasiswa, kas kelas, dan akun anggota.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profil" className="btn-secondary text-xs py-1.5 px-3">
              Profil Saya
            </Link>
            <Link href="/kas" className="btn-primary text-xs py-1.5 px-3">
              Buku Kas
            </Link>
          </div>
        </div>

        {/* Tab Navigasi Admin */}
        <div className="border-b border-ib-border flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("jadwal")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "jadwal"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            📅 Jadwal Kuliah
          </button>
          <button
            onClick={() => setActiveTab("galeri")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "galeri"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            🖼️ Galeri Foto
          </button>
          <button
            onClick={() => setActiveTab("mahasiswa")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "mahasiswa"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            🎓 Mahasiswa (24)
          </button>
          <button
            onClick={() => setActiveTab("kas")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "kas"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            💰 Kas (Bendahara)
          </button>
          <button
            onClick={() => setActiveTab("akun")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "akun"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            🔑 Akun &amp; Aktivasi {isKetua && "★"}
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2.5 px-4 rounded-t border-t border-l border-r -mb-px transition whitespace-nowrap ${
              activeTab === "logs"
                ? "bg-white border-ib-border text-ib-dark font-bold"
                : "border-transparent text-ib-text/70 hover:text-ib-dark hover:bg-white/50"
            }`}
          >
            📋 Log Aktivitas
          </button>
        </div>

        {/* ─── TAB 1: KELOLA JADWAL KULIAH ─── */}
        {activeTab === "jadwal" && (
          <div className="space-y-6">
            {/* Form Tambah Jadwal */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Tambah Mata Kuliah &amp; Jadwal
              </h2>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Nama Mata Kuliah *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pemrograman Web Lanjut"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Dosen Pengampu *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Dr. Ir. ..."
                      value={lecturerName}
                      onChange={(e) => setLecturerName(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Semester *
                    </label>
                    <select
                      value={schedSemester}
                      onChange={(e) => setSchedSemester(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3 (Aktif)</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Hari *
                    </label>
                    <select
                      value={schedDay}
                      onChange={(e) => setSchedDay(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Jam Kuliah (Mulai - Selesai) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={schedStartTime}
                        onChange={(e) => setSchedStartTime(e.target.value)}
                        className="w-full text-xs p-2 border border-ib-border rounded"
                        required
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={schedEndTime}
                        onChange={(e) => setSchedEndTime(e.target.value)}
                        className="w-full text-xs p-2 border border-ib-border rounded"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Ruangan / Lab *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Lab Komputer 2 / Gedung MI"
                      value={schedRoom}
                      onChange={(e) => setSchedRoom(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Catatan Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Membawa laptop dengan aplikasi Docker terpasang"
                    value={schedNotes}
                    onChange={(e) => setSchedNotes(e.target.value)}
                    className="w-full text-xs p-2 border border-ib-border rounded"
                  />
                </div>

                {schedMsg && (
                  <div
                    className={`p-2.5 rounded text-xs font-semibold ${
                      schedMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {schedMsg.text}
                  </div>
                )}

                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  Simpan Jadwal Kuliah
                </button>
              </form>
            </div>

            {/* Tabel Daftar Jadwal */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Daftar Jadwal Kuliah Terdaftar
              </h2>
              {schedLoading ? (
                <p className="text-xs text-ib-text/60 animate-pulse">Memuat jadwal…</p>
              ) : schedules.length === 0 ? (
                <p className="text-xs text-ib-text/60">Belum ada jadwal yang ditambahkan.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-ib-border uppercase tracking-wider text-ib-text/60 bg-[#F7F5EF]">
                        <th className="py-2.5 px-3">Semester</th>
                        <th className="py-2.5 px-3">Hari &amp; Jam</th>
                        <th className="py-2.5 px-3">Mata Kuliah</th>
                        <th className="py-2.5 px-3">Dosen</th>
                        <th className="py-2.5 px-3">Ruangan</th>
                        <th className="py-2.5 px-3">Catatan</th>
                        <th className="py-2.5 px-3 text-center">Status / Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ib-border/60">
                      {schedules.map((s) => (
                        <tr key={s.id} className={`hover:bg-[#FCFAF5] ${s.archived ? "opacity-60 bg-gray-50" : ""}`}>
                          <td className="py-2.5 px-3 font-semibold">Sem {s.semester}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                            {s.day}, {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-ib-dark">{s.course?.name}</td>
                          <td className="py-2.5 px-3 text-ib-text/80">{s.course?.lecturer_name}</td>
                          <td className="py-2.5 px-3 font-mono">{s.room}</td>
                          <td className="py-2.5 px-3 text-ib-text/60">{s.notes || "-"}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(s)}
                              className="text-[11px] font-bold text-ib-action hover:text-ib-dark hover:underline"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleArchiveSchedule(s.id, s.archived)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                                s.archived
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                              }`}
                            >
                              {s.archived ? "Aktifkan" : "Arsipkan"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: KELOLA GALERI FOTO ─── */}
        {activeTab === "galeri" && (
          <div className="space-y-6">
            {/* Form Upload Galeri (WebP & EXIF Stripped) */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
              <div className="border-b border-ib-border pb-2">
                <h2 className="font-serif text-lg font-bold text-ib-dark">
                  Unggah Foto Galeri Kelas
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Foto otomatis dikonversi ke format WebP berkualitas tinggi dan seluruh metadata lokasi (EXIF) dihapus demi privasi.
                </p>
              </div>

              <form onSubmit={handleUploadGallery} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Pilih Berkas Foto (JPG, PNG, atau WebP, maks 5 MB) *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleSelectGalleryFile}
                      className="w-full text-xs p-1.5 border border-ib-border rounded bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Tanggal Pengambilan Foto *
                    </label>
                    <input
                      type="date"
                      value={galleryTakenOn}
                      onChange={(e) => setGalleryTakenOn(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Judul Foto *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Praktikum Pemrograman Web"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Kategori Galeri *
                    </label>
                    <select
                      value={galleryCategory}
                      onChange={(e) => setGalleryCategory(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="Dokumentasi Kuliah">Dokumentasi Kuliah</option>
                      <option value="Kegiatan Kelas">Kegiatan Kelas</option>
                      <option value="Momen Santai">Momen Santai / Hangout</option>
                      <option value="Prestasi & Acara">Prestasi &amp; Acara Kampus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Semester Terkait *
                    </label>
                    <select
                      value={gallerySemester}
                      onChange={(e) => setGallerySemester(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Keterangan / Caption
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ceritakan sedikit momen di balik foto ini..."
                    value={galleryCaption}
                    onChange={(e) => setGalleryCaption(e.target.value)}
                    className="w-full text-xs p-2 border border-ib-border rounded"
                  />
                </div>

                {/* Toggle Pilihan Beranda (Hero Photo) */}
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded bg-amber-50 border border-amber-200">
                  <input
                    type="checkbox"
                    checked={galleryIsFeatured}
                    onChange={(e) => setGalleryIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-ib-action border-ib-border rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Jadikan Foto Pilihan Beranda (Hero Section)
                    </span>
                    <span className="text-[11px] text-amber-900/80 block">
                      Foto ini akan ditampilkan di bagian atas beranda utama website IB 2025.
                    </span>
                  </div>
                </label>

                {/* Preview Foto */}
                {galleryPreview && (
                  <div className="p-3 border border-ib-border rounded bg-[#FCFAF5] flex items-center gap-4">
                    <img
                      src={galleryPreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded border border-ib-border"
                    />
                    <div className="text-xs text-ib-text/70 space-y-1">
                      <p className="font-semibold text-ib-dark">✓ Foto Terkonversi ke WebP</p>
                      <p>EXIF / Data Lokasi: Dihapus otomatis</p>
                      <p>Siap diunggah ke penyimpanan galeri kelas.</p>
                    </div>
                  </div>
                )}

                {galleryMsg && (
                  <div
                    className={`p-2.5 rounded text-xs font-semibold ${
                      galleryMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {galleryMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingGallery || !galleryFile}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {uploadingGallery ? "Mengunggah WebP…" : "Unggah ke Galeri Kelas"}
                </button>
              </form>
            </div>

            {/* Daftar Galeri & Pengaturan Foto Pilihan */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Daftar Koleksi Galeri ({galleryItems.length})
              </h2>

              {galleryLoading ? (
                <p className="text-xs text-ib-text/60 animate-pulse">Memuat galeri…</p>
              ) : galleryItems.length === 0 ? (
                <p className="text-xs text-ib-text/60">Belum ada foto di galeri kelas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded overflow-hidden flex flex-col justify-between ${
                        item.is_featured
                          ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400"
                          : "border-ib-border bg-white"
                      }`}
                    >
                      <div>
                        <div className="h-44 bg-gray-100 overflow-hidden relative">
                          <img
                            src={item.image_path}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          {item.is_featured && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded shadow">
                              ★ Pilihan Beranda
                            </span>
                          )}
                          {item.archived && (
                            <span className="absolute top-2 right-2 bg-red-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded shadow">
                              Diarsipkan
                            </span>
                          )}
                        </div>
                        <div className="p-3 text-xs space-y-1">
                          <h3 className="font-bold text-ib-dark truncate">{item.title}</h3>
                          <p className="text-[11px] text-ib-text/60">
                            Sem {item.semester} · {item.category} · {item.taken_on}
                          </p>
                          {item.caption && (
                            <p className="text-ib-text/80 line-clamp-2 mt-1">{item.caption}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-3 pt-0 flex flex-col gap-2 border-t border-ib-border/60 mt-2">
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGallery(item)}
                            className="text-[11px] font-bold text-ib-action hover:text-ib-dark hover:underline flex items-center gap-1"
                          >
                            ✏️ Ganti Gambar / Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleArchiveGallery(item.id, item.archived)}
                            className="text-[11px] text-red-600 hover:underline font-semibold"
                          >
                            {item.archived ? "Pulihkan" : "Arsipkan"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFeaturedGallery(item.id, item.is_featured)}
                          className={`w-full text-center text-[10px] font-semibold py-1 rounded border transition ${
                            item.is_featured
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-white text-ib-text hover:bg-[#F7F5EF] border-ib-border"
                          }`}
                        >
                          {item.is_featured ? "★ Foto Hero Beranda Aktif" : "Set Jadi Hero Beranda"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: DATA MAHASISWA (24 NAMA) ─── */}
        {activeTab === "mahasiswa" && (
          <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-ib-dark">
                  Daftar 24 Mahasiswa Kelas IB 2025
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Data resmi kelas yang disinkronkan dari absensi jurusan D3 Manajemen Informatika Polsri.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F7F5EF] border border-ib-border text-ib-text">
                Total: {accounts.length} Mahasiswa
              </span>
            </div>

            {accountsLoading ? (
              <p className="text-xs text-ib-text/60 animate-pulse">Memuat data mahasiswa…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ib-border uppercase tracking-wider text-ib-text/60 bg-[#F7F5EF]">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">NPM</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Nama Panggilan</th>
                      <th className="py-2.5 px-3">Jabatan / Role</th>
                      <th className="py-2.5 px-3">Hak Kas</th>
                      <th className="py-2.5 px-3">Privasi Foto</th>
                      <th className="py-2.5 px-3">Privasi Ultah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ib-border/60">
                    {accounts.map((acc, idx) => (
                      <tr key={acc.id} className="hover:bg-[#FCFAF5]">
                        <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-ib-dark">{acc.nim}</td>
                        <td className="py-2.5 px-3 font-bold text-ib-dark">{acc.full_name}</td>
                        <td className="py-2.5 px-3 text-ib-text/80">{acc.nickname || "-"}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              acc.role === "super_admin"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : acc.role === "admin"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {acc.position || (acc.role === "super_admin" ? "Ketua" : "Mahasiswa")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {acc.can_manage_kas ? (
                            <span className="text-emerald-700">✓ Bendahara</span>
                          ) : (
                            <span className="text-ib-text/40">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {acc.photo_public ? "Publik" : "Inisial"}
                        </td>
                        <td className="py-2.5 px-3">
                          {acc.birthday_public ? "Tampil" : "Sembunyi"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: KAS (BENDAHARA) ─── */}
        {activeTab === "kas" && (
          <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-6">
            <div className="border-b border-ib-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-ib-dark">
                  Pusat Pengelolaan Kas Kelas
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Seluruh operasi pencatatan iuran (checklist 24 nama), pencatatan pengeluaran, dan pembatalan transaksi (void) dipusatkan di modul Kas.
                </p>
              </div>

              <Link href="/kas" className="btn-primary text-xs py-2 px-4 self-start sm:self-auto">
                Buka Halaman Kas Lengkap ↗
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-ib-border rounded bg-[#FCFAF5] space-y-2">
                <span className="text-xs uppercase font-bold text-ib-dark block">1. Checklist 24 Nama</span>
                <p className="text-xs text-ib-text/70">
                  Catat pembayaran mahasiswa per periode secara cepat dengan menandai nama-nama dari daftar kelas.
                </p>
                <Link href="/kas" className="text-xs text-ib-action font-semibold hover:underline block pt-2">
                  Buka Layar Catat Pembayaran →
                </Link>
              </div>

              <div className="p-4 border border-ib-border rounded bg-[#FCFAF5] space-y-2">
                <span className="text-xs uppercase font-bold text-ib-dark block">2. Catat Pengeluaran</span>
                <p className="text-xs text-ib-text/70">
                  Input pengeluaran kelas beserta kategori dan keterangan spesifik demi akuntabilitas bersama.
                </p>
                <Link href="/kas" className="text-xs text-ib-action font-semibold hover:underline block pt-2">
                  Buka Form Pengeluaran →
                </Link>
              </div>

              <div className="p-4 border border-ib-border rounded bg-[#FCFAF5] space-y-2">
                <span className="text-xs uppercase font-bold text-ib-dark block">3. Audit Trail &amp; Void</span>
                <p className="text-xs text-ib-text/70">
                  Pembatalan transaksi append-only yang mewajibkan input alasan resmi tanpa menghapus data asal.
                </p>
                <Link href="/kas" className="text-xs text-ib-action font-semibold hover:underline block pt-2">
                  Buka Buku Kas Besar →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: KELOLA AKUN & AKTIVASI (KETUA) ─── */}
        {activeTab === "akun" && (
          <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-ib-dark">
                  Manajemen Akun Mahasiswa &amp; Aktivasi
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Aktivasi akun kelas dan reset password sementara adalah hak prerogatif Ketua Kelas (Super Admin).
                </p>
              </div>

              <div className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
                {isKetua ? "★ Kewenangan Ketua Aktif" : "Mode Hanya Lihat (Admin)"}
              </div>
            </div>

            {!isKetua && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                Anda login sebagai Admin ({profile?.position || "Pengurus"}). Mengaktifkan/menonaktifkan akun dan me-reset password akun hanya dapat dilakukan oleh Ketua Kelas (M. Zidal Muttaqin).
              </div>
            )}

            {accountsLoading ? (
              <p className="text-xs text-ib-text/60 animate-pulse">Memuat akun…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ib-border uppercase tracking-wider text-ib-text/60 bg-[#F7F5EF]">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">NPM</th>
                      <th className="py-2.5 px-3">Nama Mahasiswa</th>
                      <th className="py-2.5 px-3">Peran</th>
                      <th className="py-2.5 px-3 text-center">Status Akun</th>
                      <th className="py-2.5 px-3 text-center">Wajib Ubah PW</th>
                      {isKetua && <th className="py-2.5 px-3 text-center">Aksi Ketua</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ib-border/60">
                    {accounts.map((acc, idx) => (
                      <tr key={acc.id} className="hover:bg-[#FCFAF5]">
                        <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-ib-dark">{acc.nim}</td>
                        <td className="py-2.5 px-3 font-bold text-ib-dark">{acc.full_name}</td>
                        <td className="py-2.5 px-3">{acc.position || acc.role}</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {acc.is_active ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              AKTIF
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                              NONAKTIF
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {acc.must_change_password ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              Ya
                            </span>
                          ) : (
                            <span className="text-[10px] text-ib-text/40">Tidak</span>
                          )}
                        </td>
                        {isKetua && (
                          <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(acc.id, acc.is_active)}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                                acc.is_active
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              {acc.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetPassword(acc.id, acc.full_name, acc.nim)}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                              title="Reset ke password sementara acak"
                            >
                              Reset PW
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: LOG AKTIVITAS ─── */}
        {activeTab === "logs" && (
          <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-ib-dark">
                  Log Aktivitas &amp; Audit Trail
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Rekam jejak setiap perubahan penting pada database website kelas demi akuntabilitas penuh.
                </p>
              </div>

              <button
                type="button"
                onClick={loadLogs}
                className="btn-secondary text-xs py-1 px-3 self-start sm:self-auto"
              >
                Refresh Log
              </button>
            </div>

            {logsLoading ? (
              <p className="text-xs text-ib-text/60 animate-pulse">Memuat log…</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-ib-text/60">Belum ada catatan aktivitas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ib-border uppercase tracking-wider text-ib-text/60 bg-[#F7F5EF]">
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Pelaku</th>
                      <th className="py-2.5 px-3">Aksi</th>
                      <th className="py-2.5 px-3">Tabel</th>
                      <th className="py-2.5 px-3">Rincian Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ib-border/60 font-mono text-[11px]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FCFAF5]">
                        <td className="py-2 px-3 whitespace-nowrap text-ib-text/60">
                          {new Date(log.created_at).toLocaleString("id-ID")}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-bold text-ib-dark">
                          {log.user?.nickname || log.user?.full_name || "Sistem"}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-ib-text/70">{log.target_table}</td>
                        <td className="py-2 px-3 font-mono text-[10px] text-ib-text/80 max-w-md truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL PASSWORD SEMENTARA HASIL RESET ─── */}
        {tempPasswordModal.open && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-ib-border">
              <div className="border-b border-ib-border pb-2">
                <h3 className="font-serif text-lg font-bold text-ib-dark">
                  Password Sementara Berhasil Dibuat
                </h3>
                <p className="text-xs text-ib-text/70 mt-1">
                  Berikan password ini kepada mahasiswa bersangkutan. Mahasiswa akan diwajibkan mengganti password baru pada saat pertama kali login.
                </p>
              </div>

              <div className="bg-[#F7F5EF] p-4 rounded border border-ib-border space-y-2">
                <div className="text-xs">
                  <span className="text-ib-text/60 block">Mahasiswa:</span>
                  <span className="font-bold text-ib-dark text-sm">{tempPasswordModal.name}</span>
                  <span className="text-ib-text/70 font-mono block text-xs">NPM: {tempPasswordModal.nim}</span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-ib-text/60 block mb-1">Password Baru Acak:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tempPasswordModal.tempPassword}
                      className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-ib-action rounded text-ib-dark select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPasswordModal.tempPassword);
                        setCopied(true);
                      }}
                      className="btn-primary text-xs py-2 px-3 whitespace-nowrap"
                    >
                      {copied ? "Tersalin ✓" : "Salin"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setTempPasswordModal({ open: false, name: "", nim: "", tempPassword: "" })}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL EDIT / GANTI FOTO GALERI ─── */}
        {editingGalleryItem && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4 border border-ib-border max-h-[90vh] overflow-y-auto">
              <div className="border-b border-ib-border pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ib-dark">
                    Edit &amp; Ganti Foto Galeri
                  </h3>
                  <p className="text-xs text-ib-text/70">
                    Perbarui informasi atau ganti gambar avatar/mock dengan foto asli dokumentasi kelas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGalleryItem(null)}
                  className="text-ib-text/50 hover:text-ib-dark font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveGalleryEdit} className="space-y-4">
                {/* Preview Foto Saat Ini & Foto Baru */}
                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Gambar Saat Ini / Preview Gambar Baru
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded border border-ib-border bg-[#FCFAF5]">
                    {editGalleryPreview ? (
                      <img
                        src={editGalleryPreview}
                        alt="Preview"
                        className="w-28 h-20 object-cover rounded border border-ib-border"
                      />
                    ) : (
                      <div className="w-28 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        Tidak ada gambar
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <span className="text-xs text-ib-text/70 block">
                        Ingin mengganti gambar ini dengan foto dokumentasi asli?
                      </span>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleSelectEditGalleryFile}
                        className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-ib-dark file:text-white hover:file:bg-ib-action cursor-pointer"
                      />
                      <span className="text-[10px] text-ib-text/50 block">
                        Format: WebP, JPG, PNG (maks 5 MB). Otomatis dikonversi ke WebP &amp; EXIF dihapus.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Judul Foto *
                    </label>
                    <input
                      type="text"
                      value={editGalleryTitle}
                      onChange={(e) => setEditGalleryTitle(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Tanggal Pengambilan *
                    </label>
                    <input
                      type="date"
                      value={editGalleryTakenOn}
                      onChange={(e) => setEditGalleryTakenOn(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Kategori Galeri *
                    </label>
                    <select
                      value={editGalleryCategory}
                      onChange={(e) => setEditGalleryCategory(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="Akademik">Akademik</option>
                      <option value="Kebersamaan">Kebersamaan</option>
                      <option value="Dokumentasi Kuliah">Dokumentasi Kuliah</option>
                      <option value="Kegiatan Kampus">Kegiatan Kampus</option>
                      <option value="Lomba & Proyek">Lomba &amp; Proyek</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Semester *
                    </label>
                    <select
                      value={editGallerySemester}
                      onChange={(e) => setEditGallerySemester(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="1">Semester 1 (1IB)</option>
                      <option value="2">Semester 2 (2IB)</option>
                      <option value="3">Semester 3 (3IB)</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Keterangan / Caption
                  </label>
                  <textarea
                    rows={3}
                    value={editGalleryCaption}
                    onChange={(e) => setEditGalleryCaption(e.target.value)}
                    className="w-full text-xs p-2 border border-ib-border rounded"
                  />
                </div>

                {editGalleryMsg && (
                  <div
                    className={`p-2.5 rounded text-xs font-semibold ${
                      editGalleryMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {editGalleryMsg.text}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-ib-border">
                  <button
                    type="button"
                    onClick={() => setEditingGalleryItem(null)}
                    disabled={savingGalleryEdit}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingGalleryEdit}
                    className="btn-primary text-xs py-1.5 px-4 font-bold"
                  >
                    {savingGalleryEdit ? "Menyimpan Perubahan…" : "Simpan Perubahan Foto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL EDIT JADWAL KULIAH ─── */}
        {editingSchedule && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4 border border-ib-border max-h-[90vh] overflow-y-auto">
              <div className="border-b border-ib-border pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ib-dark">
                    Edit Jadwal Kuliah
                  </h3>
                  <p className="text-xs text-ib-text/70">
                    Ubah mata kuliah, dosen pengampu, hari, jam, atau ruangan perkuliahan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="text-ib-text/50 hover:text-ib-dark font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveScheduleEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Nama Mata Kuliah *
                    </label>
                    <input
                      type="text"
                      value={editCourseName}
                      onChange={(e) => setEditCourseName(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Dosen Pengampu *
                    </label>
                    <input
                      type="text"
                      value={editLecturerName}
                      onChange={(e) => setEditLecturerName(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Semester *
                    </label>
                    <select
                      value={editSchedSemester}
                      onChange={(e) => setEditSchedSemester(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Hari *
                    </label>
                    <select
                      value={editSchedDay}
                      onChange={(e) => setEditSchedDay(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded bg-white"
                    >
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Ruangan / Lab *
                    </label>
                    <input
                      type="text"
                      value={editSchedRoom}
                      onChange={(e) => setEditSchedRoom(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Jam Mulai *
                    </label>
                    <input
                      type="time"
                      value={editSchedStartTime}
                      onChange={(e) => setEditSchedStartTime(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                      Jam Selesai *
                    </label>
                    <input
                      type="time"
                      value={editSchedEndTime}
                      onChange={(e) => setEditSchedEndTime(e.target.value)}
                      className="w-full text-xs p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Catatan Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editSchedNotes}
                    onChange={(e) => setEditSchedNotes(e.target.value)}
                    className="w-full text-xs p-2 border border-ib-border rounded"
                    placeholder="Contoh: Jadwal pindah lab / bawa modul"
                  />
                </div>

                {editSchedMsg && (
                  <div
                    className={`p-2.5 rounded text-xs font-semibold ${
                      editSchedMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {editSchedMsg.text}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-ib-border">
                  <button
                    type="button"
                    onClick={() => setEditingSchedule(null)}
                    disabled={savingSchedEdit}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingSchedEdit}
                    className="btn-primary text-xs py-1.5 px-4 font-bold"
                  >
                    {savingSchedEdit ? "Menyimpan Perubahan…" : "Simpan Perubahan Jadwal"}
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
