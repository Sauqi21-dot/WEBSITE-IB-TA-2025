"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import ImageCropModal from "@/components/ImageCropModal";
import { Profile } from "@/types/database";
import {
  validateSocialLink,
  parseInstagramDisplay,
  parseLinkedinDisplay,
  parseWebsiteDisplay,
} from "@/lib/social-links";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

type SaveStatus = "idle" | "saving" | "success" | "error";
type PhotoStatus = "idle" | "uploading" | "success" | "error";
type PwStatus = "idle" | "saving" | "success" | "error";

export default function ProfilPage() {
  const router = useRouter();

  /* ─── data profil ─── */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  /* ─── form edit profil ─── */
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [birthdayDay, setBirthdayDay] = useState<string>("");
  const [birthdayMonth, setBirthdayMonth] = useState<string>("");
  const [photoPublic, setPhotoPublic] = useState(false);
  const [birthdayPublic, setBirthdayPublic] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  /* ─── foto profil ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle");
  const [photoMsg, setPhotoMsg] = useState("");

  /* ─── save profil ─── */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMsg, setSaveMsg] = useState("");

  /* ─── ganti password ─── */
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<PwStatus>("idle");
  const [pwMsg, setPwMsg] = useState("");

  /* ─── load profil ─── */
  useEffect(() => {
    setProfile(null);
    setLoading(true);
    setPageError(null);

    async function load() {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 400));
          }
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            if (attempt === 2) {
              window.location.href = "/login";
              return;
            }
            continue;
          }

          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (data) {
            const p = data as Profile;
            setProfile(p);
            setNickname(p.nickname || "");
            setBio(p.bio || "");
            setBirthdayDay(p.birthday_day ? String(p.birthday_day) : "");
            setBirthdayMonth(p.birthday_month ? String(p.birthday_month) : "");
            setPhotoPublic(p.photo_public ?? false);
            setBirthdayPublic(p.birthday_public ?? false);
            setInstagramUrl(p.instagram_url || "");
            setLinkedinUrl(p.linkedin_url || "");
            setWebsiteUrl(p.website_url || "");
            setPreviewUrl(p.photo_path || null);
            setLoading(false);
            return;
          }
          if (error) {
            console.warn(`[Profil] load attempt ${attempt + 1} gagal:`, error.message);
          }
        } catch (err) {
          console.warn(`[Profil] load attempt ${attempt + 1} error:`, err);
        }
      }
      setPageError("Data profil tidak dapat dimuat saat ini. Silakan muat ulang halaman.");
      setLoading(false);
    }
    load();
  }, [router]);

  /* ─── pilih foto & buka editor crop ─── */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoStatus("idle");
    setPhotoMsg("");

    // Validasi format: hanya JPG, PNG, atau WebP
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPhotoMsg("Format foto tidak didukung. Harap unggah berkas JPG, PNG, atau WebP.");
      setPhotoStatus("error");
      e.target.value = "";
      return;
    }

    // Validasi ukuran: maksimal 2 MB
    if (file.size > 2 * 1024 * 1024) {
      setPhotoMsg("Ukuran berkas melebihi batas 2 MB. Silakan pilih foto dengan ukuran lebih kecil.");
      setPhotoStatus("error");
      e.target.value = "";
      return;
    }

    // Buka modal editor crop interaktif
    setCropFile(file);
    // reset input agar file yang sama bisa dipilih kembali jika dibatalkan
    e.target.value = "";
  }, []);

  /* ─── penanganan hasil pemotongan foto (crop) ─── */
  const handleCropComplete = useCallback((croppedBlob: Blob, croppedDataUrl: string) => {
    setPendingBlob(croppedBlob);
    setPreviewUrl(croppedDataUrl);
    setCropFile(null);
    setPhotoStatus("idle");
    setPhotoMsg("Foto berhasil dipotong dan disesuaikan. Klik 'Simpan Foto' untuk mengunggah.");
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropFile(null);
  }, []);

  /* ─── upload foto ─── */
  const handleUploadPhoto = useCallback(async () => {
    if (!pendingBlob) return;
    setPhotoStatus("uploading");
    setPhotoMsg("");
    try {
      const form = new FormData();
      form.append("file", new File([pendingBlob], `avatar-${Date.now()}.webp`, { type: "image/webp" }));
      const res = await fetch("/api/profile/upload-photo", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal upload foto.");
      setPhotoStatus("success");
      setPhotoMsg("Foto profil berhasil diperbarui.");
      setPendingBlob(null);
      // update profile state agar avatar di navbar ikut refresh
      setProfile((prev) => prev ? { ...prev, photo_path: json.photo_path } : prev);
      router.refresh();
    } catch (err: any) {
      setPhotoStatus("error");
      setPhotoMsg(err.message || "Gagal mengunggah foto.");
    }
  }, [pendingBlob, router]);

  /* ─── simpan profil ─── */
  const handleSaveProfile = useCallback(async () => {
    setSaveStatus("saving");
    setSaveMsg("");
    try {
      const payload: Record<string, any> = {
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        birthday_day: birthdayDay ? parseInt(birthdayDay, 10) : null,
        birthday_month: birthdayMonth ? parseInt(birthdayMonth, 10) : null,
        photo_public: photoPublic,
        birthday_public: birthdayPublic,
        instagram_url: instagramUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
      };
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan profil.");
      setSaveStatus("success");
      setSaveMsg("Profil berhasil disimpan.");
      if (json.profile) setProfile(json.profile as Profile);
      router.refresh();
    } catch (err: any) {
      setSaveStatus("error");
      setSaveMsg(err.message || "Terjadi kesalahan saat menyimpan.");
    }
  }, [nickname, bio, birthdayDay, birthdayMonth, photoPublic, birthdayPublic, instagramUrl, linkedinUrl, websiteUrl, router]);

  /* ─── ganti password ─── */
  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus("saving");
    setPwMsg("");
    if (pwNew !== pwConfirm) {
      setPwStatus("error");
      setPwMsg("Konfirmasi password tidak sesuai.");
      return;
    }
    if (pwNew.length < 8) {
      setPwStatus("error");
      setPwMsg("Password baru minimal 8 karakter.");
      return;
    }
    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengganti password.");
      setPwStatus("success");
      setPwMsg("Password berhasil diganti.");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err: any) {
      setPwStatus("error");
      setPwMsg(err.message || "Gagal mengganti password.");
    }
  }, [pwCurrent, pwNew, pwConfirm]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  /* ─── inisial avatar ─── */
  const initials = profile
    ? (profile.nickname || profile.full_name || "?").slice(0, 2).toUpperCase()
    : "?";

  /* ─── render ─── */
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
          <div className="bg-white border border-ib-border p-10 rounded text-center">
            <p className="text-sm text-ib-text/60 animate-pulse">Memuat profil mahasiswa…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (pageError || !profile) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
          <div className="bg-red-50 border border-ib-danger p-6 rounded text-ib-danger">
            <p className="font-semibold">{pageError || "Data profil tidak ditemukan."}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-6">

        {/* ─── Kartu identitas ─── */}
        <div className="bg-white border border-ib-border rounded shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* foto avatar + tombol ganti */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-ib-dark/10 border-2 border-ib-dark">
                {previewUrl ? (
                  <img src={previewUrl} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold font-serif text-2xl text-ib-dark">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ib-dark text-white flex items-center justify-center text-xs hover:bg-ib-action transition-colors shadow"
                title="Ganti foto profil"
              >
                ✎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-emerald-100 text-ib-dark rounded">
                  Mahasiswa Aktif
                </span>
                {profile.role === "super_admin" && (
                  <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                    {profile.position ? `${profile.position} · Super Admin` : "Super Admin"}
                  </span>
                )}
                {profile.role === "admin" && (
                  <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-200 rounded">
                    Admin · {profile.position || "Pengurus"}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-2xl font-bold text-ib-dark">{profile.full_name}</h1>
              <p className="text-xs text-ib-text/70 font-mono">NPM: {profile.nim}</p>
              {/* Tautan sosial di kartu identitas */}
              {(profile.instagram_url || profile.linkedin_url || profile.website_url) && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {(() => {
                    const validUrl = validateSocialLink("instagram", profile.instagram_url);
                    if (!validUrl) return null;
                    const user = parseInstagramDisplay(validUrl);
                    return (
                      <a href={validUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Instagram @${user}`} className="flex items-center gap-1 text-xs text-ib-text/70 hover:text-ib-dark transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        @{user}
                      </a>
                    );
                  })()}
                  {(() => {
                    const validUrl = validateSocialLink("linkedin", profile.linkedin_url);
                    if (!validUrl) return null;
                    const handle = parseLinkedinDisplay(validUrl);
                    return (
                      <a href={validUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`LinkedIn ${handle}`} className="flex items-center gap-1 text-xs text-ib-text/70 hover:text-ib-dark transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                        {handle}
                      </a>
                    );
                  })()}
                  {(() => {
                    const validUrl = validateSocialLink("website", profile.website_url);
                    if (!validUrl) return null;
                    const domain = parseWebsiteDisplay(validUrl);
                    return (
                      <a href={validUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Website ${domain}`} className="flex items-center gap-1 text-xs text-ib-text/70 hover:text-ib-dark transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        {domain}
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-ib-danger hover:underline font-semibold px-2 py-1 self-end sm:self-auto"
          >
            Keluar (Logout)
          </button>
        </div>

        {/* banner foto pending upload */}
        {pendingBlob && (
          <div className="bg-amber-50 border border-amber-300 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Foto baru dipilih — belum disimpan.</p>
              <p className="text-xs text-amber-800 mt-0.5">Klik "Simpan Foto" untuk mengunggah ke profil Anda.</p>
            </div>
            <button
              onClick={handleUploadPhoto}
              disabled={photoStatus === "uploading"}
              className="btn-primary text-xs py-1.5 px-4 whitespace-nowrap"
            >
              {photoStatus === "uploading" ? "Mengunggah…" : "Simpan Foto"}
            </button>
          </div>
        )}
        {photoMsg && (
          <div className={`text-sm px-4 py-2 rounded border ${photoStatus === "error" ? "bg-red-50 border-ib-danger text-ib-danger" : "bg-emerald-50 border-emerald-300 text-ib-dark"}`}>
            {photoMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ─── Kolom kiri: edit profil ─── */}
          <div className="md:col-span-2 space-y-6">

            {/* Form Edit */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-6 space-y-5">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Edit Profil
              </h2>

              {/* Nama lengkap — read only */}
              <div>
                <label className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-ib-text/40">(tidak dapat diubah)</span>
                </label>
                <div className="w-full px-3 py-2 bg-[#F3F1EC] border border-ib-border rounded text-sm text-ib-text/70 font-semibold select-none">
                  {profile.full_name}
                </div>
              </div>

              {/* NPM — read only */}
              <div>
                <label className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  NPM <span className="text-ib-text/40">(tidak dapat diubah)</span>
                </label>
                <div className="w-full px-3 py-2 bg-[#F3F1EC] border border-ib-border rounded text-sm text-ib-text/70 font-mono select-none">
                  {profile.nim}
                </div>
              </div>

              {/* Nama panggilan */}
              <div>
                <label htmlFor="nickname" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  Nama Panggilan
                </label>
                <input
                  id="nickname"
                  type="text"
                  maxLength={50}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Contoh: Zidal, Sauqi, Alika…"
                  className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                />
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  Bio Singkat
                  <span className={`ml-2 ${bio.length > 280 ? "text-ib-danger font-semibold" : "text-ib-text/40"}`}>
                    {bio.length}/300
                  </span>
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan sedikit tentang diri Anda…"
                  className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40 resize-y"
                />
              </div>

              {/* Ulang tahun */}
              <div className="grid grid-cols-2 gap-4">                <div>
                  <label htmlFor="bday" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                    Tanggal Lahir
                  </label>
                  <select
                    id="bday"
                    value={birthdayDay}
                    onChange={(e) => setBirthdayDay(e.target.value)}
                    className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                  >
                    <option value="">— tidak diatur —</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bmonth" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                    Bulan Lahir
                  </label>
                  <select
                    id="bmonth"
                    value={birthdayMonth}
                    onChange={(e) => setBirthdayMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                  >
                    <option value="">— tidak diatur —</option>
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-ib-text/50 -mt-2">Tahun lahir tidak disimpan — hanya hari &amp; bulan.</p>

              {/* Tautan sosial opsional */}
              <div>
                <label htmlFor="instagram_url" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  Instagram <span className="text-ib-text/40 normal-case">(username atau link profil, opsional)</span>
                </label>
                <input
                  id="instagram_url"
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="@username atau https://instagram.com/username"
                  className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                />
              </div>

              <div>
                <label htmlFor="linkedin_url" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  LinkedIn <span className="text-ib-text/40 normal-case">(link profil, opsional)</span>
                </label>
                <input
                  id="linkedin_url"
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                />
              </div>

              <div>
                <label htmlFor="website_url" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                  Website Pribadi <span className="text-ib-text/40 normal-case">(https saja, opsional)</span>
                </label>
                <input
                  id="website_url"
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://namakamu.com"
                  className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                />
              </div>

              {/* Tombol simpan */}
              <div className="pt-2">
                {saveMsg && (
                  <div className={`text-sm mb-3 px-3 py-2 rounded border ${saveStatus === "error" ? "bg-red-50 border-ib-danger text-ib-danger" : "bg-emerald-50 border-emerald-300 text-ib-dark"}`}>
                    {saveMsg}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saveStatus === "saving"}
                  className="btn-primary w-full"
                >
                  {saveStatus === "saving" ? "Menyimpan…" : "Simpan Perubahan Profil"}
                </button>
              </div>
            </div>

            {/* ─── Ganti Password ─── */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Ganti Password
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="pw-current" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                    Password Saat Ini
                  </label>
                  <input
                    id="pw-current"
                    type="password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                  />
                </div>
                <div>
                  <label htmlFor="pw-new" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                    Password Baru
                  </label>
                  <input
                    id="pw-new"
                    type="password"
                    value={pwNew}
                    minLength={8}
                    onChange={(e) => setPwNew(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                  />
                </div>
                <div>
                  <label htmlFor="pw-confirm" className="block text-xs text-ib-text/60 uppercase tracking-wider mb-1">
                    Ulangi Password Baru
                  </label>
                  <input
                    id="pw-confirm"
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-ib-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ib-action/40"
                  />
                </div>

                <ul className="text-xs text-ib-text/60 list-disc list-inside space-y-0.5">
                  <li className={pwNew.length >= 8 ? "text-ib-action font-semibold" : ""}>Minimal 8 karakter</li>
                  <li className={pwNew && pwNew === pwConfirm ? "text-ib-action font-semibold" : ""}>Konfirmasi password harus sesuai</li>
                </ul>

                {pwMsg && (
                  <div className={`text-sm px-3 py-2 rounded border ${pwStatus === "error" ? "bg-red-50 border-ib-danger text-ib-danger" : "bg-emerald-50 border-emerald-300 text-ib-dark"}`}>
                    {pwMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwStatus === "saving"}
                  className="btn-primary w-full"
                >
                  {pwStatus === "saving" ? "Menyimpan Password…" : "Ganti Password"}
                </button>
              </form>
            </div>

          </div>

          {/* ─── Kolom kanan: privasi ─── */}
          <div className="space-y-6">

            <div className="bg-white border border-ib-border rounded shadow-sm p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                Pengaturan Privasi
              </h2>

              {/* Toggle foto publik */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={photoPublic}
                    onChange={(e) => setPhotoPublic(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${photoPublic ? "bg-ib-action" : "bg-ib-border"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${photoPublic ? "translate-x-5" : ""}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ib-dark group-hover:text-ib-action transition-colors">
                    Tampilkan foto di halaman Mahasiswa
                  </p>
                  <p className="text-xs text-ib-text/60 mt-0.5">
                    {photoPublic ? "Foto Anda tampil di direktori publik." : "Hanya inisial nama yang tampil."}
                  </p>
                </div>
              </label>

              {/* Toggle ulang tahun publik */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={birthdayPublic}
                    onChange={(e) => setBirthdayPublic(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${birthdayPublic ? "bg-ib-action" : "bg-ib-border"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${birthdayPublic ? "translate-x-5" : ""}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ib-dark group-hover:text-ib-action transition-colors">
                    Tampilkan ulang tahun di kalender kelas
                  </p>
                  <p className="text-xs text-ib-text/60 mt-0.5">
                    {birthdayPublic ? "Hari & bulan ulang tahun tampil." : "Ulang tahun disembunyikan dari halaman Ulang Tahun."}
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <p className="font-semibold">Perlindungan Data:</p>
                <p className="mt-0.5">NPM dan data kontak pribadi tidak pernah dipublikasikan ke halaman publik mana pun.</p>
              </div>
            </div>

            {/* Panduan upload foto */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-5 space-y-2">
              <h3 className="text-sm font-bold text-ib-dark">Ketentuan Foto Profil</h3>
              <ul className="text-xs text-ib-text/70 list-disc list-inside space-y-1">
                <li>Format: JPG, PNG, atau WebP</li>
                <li>Ukuran maksimal: 2 MB</li>
                <li>Editor crop rasio persegi dengan pratinjau lingkaran</li>
                <li>Otomatis diperkecil (format WebP) & metadata EXIF dihapus</li>
              </ul>
            </div>

          </div>
        </div>

        {/* Modal Editor Crop Foto Interaktif */}
        {cropFile && (
          <ImageCropModal
            file={cropFile}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
