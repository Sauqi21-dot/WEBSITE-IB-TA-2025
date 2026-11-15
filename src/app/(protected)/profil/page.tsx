"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileErr || !data) {
          setError("Gagal memuat data profil.");
          return;
        }

        setProfile(data as Profile);
      } catch (err: any) {
        setError("Terjadi kesalahan saat memuat data profil.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        {loading ? (
          <div className="bg-white border border-ib-border p-8 rounded text-center">
            <p className="text-sm text-ib-text/70 animate-pulse">Memuat profil mahasiswa...</p>
          </div>
        ) : error || !profile ? (
          <div className="bg-red-50 border border-ib-danger p-6 rounded text-ib-danger">
            <p className="font-semibold">{error || "Data profil tidak ditemukan."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Sapaan Resmi (AC-06) */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-ib-dark/10 border-2 border-ib-dark flex-shrink-0 relative">
                  {profile.photo_path ? (
                    <img
                      src={profile.photo_path}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold font-serif text-2xl text-ib-dark">
                      {profile.full_name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-emerald-100 text-ib-dark rounded">
                      Mahasiswa Aktif
                    </span>
                    {profile.role === "super_admin" && (
                      <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                        Ketua (Super Admin)
                      </span>
                    )}
                    {profile.role === "admin" && (
                      <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-200 rounded">
                        Admin ({profile.position || "Pengurus"})
                      </span>
                    )}
                  </div>
                  {/* AC-06: Sapaan nama sesuai NIM */}
                  <h1 className="font-serif text-2xl md:text-3xl font-bold text-ib-dark mt-1">
                    {profile.full_name}
                  </h1>
                  <p className="text-xs text-ib-text/75 font-mono">
                    NIM: {profile.nim}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-end">
                <Link
                  href="/ganti-password"
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Ganti Password
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-ib-danger hover:underline font-semibold px-2 py-1"
                >
                  Keluar (Logout)
                </button>
              </div>
            </div>

            {/* Grid Detail Data Mahasiswa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Kolom 1 & 2: Informasi Akun & Biodata */}
              <div className="md:col-span-2 bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
                <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                  Informasi Profil Saya
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-ib-text/60 block">Nama Lengkap</span>
                    <span className="font-semibold text-ib-dark">{profile.full_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ib-text/60 block">Nama Panggilan</span>
                    <span className="font-semibold text-ib-dark">{profile.nickname || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ib-text/60 block">NIM (Nomor Induk Mahasiswa)</span>
                    <span className="font-mono font-semibold text-ib-dark">{profile.nim}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ib-text/60 block">Jabatan Struktur Kelas</span>
                    <span className="font-semibold text-ib-dark">{profile.position || "Mahasiswa"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ib-text/60 block">Hak Pengelolaan Kas</span>
                    <span className={`font-semibold ${profile.can_manage_kas ? "text-ib-action" : "text-ib-text/70"}`}>
                      {profile.can_manage_kas ? "Ya (Bendahara / Super Admin)" : "Tidak"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-ib-text/60 block">Ulang Tahun</span>
                    <span className="font-semibold text-ib-dark">
                      {profile.birthday_day && profile.birthday_month
                        ? `${profile.birthday_day} / ${profile.birthday_month} (Hari & Bulan)`
                        : "Belum diatur"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-ib-text/60 block">Bio Singkat</span>
                  <p className="text-sm text-ib-text bg-[#FCFAF5] p-3 rounded border border-ib-border mt-1">
                    {profile.bio || "Belum ada bio."}
                  </p>
                </div>
              </div>

              {/* Kolom 3: Pengaturan Privasi & Keamanan */}
              <div className="bg-white border border-ib-border p-6 rounded shadow-sm space-y-4">
                <h2 className="font-serif text-lg font-bold text-ib-dark border-b border-ib-border pb-2">
                  Privasi Publik
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#FCFAF5] border border-ib-border rounded">
                    <p className="font-semibold text-ib-dark">Tampil Foto di Direktori Publik:</p>
                    <p className="text-ib-text/80 mt-0.5">
                      {profile.photo_public ? "Diizinkan (Foto tampil)" : "Tidak (Hanya inisial)"}
                    </p>
                  </div>

                  <div className="p-3 bg-[#FCFAF5] border border-ib-border rounded">
                    <p className="font-semibold text-ib-dark">Tampil Ulang Tahun di Kalender:</p>
                    <p className="text-ib-text/80 mt-0.5">
                      {profile.birthday_public ? "Diizinkan (Tampil hari & bulan)" : "Disembunyikan"}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-ib-text/80">
                    <p className="font-semibold text-amber-900">Perlindungan NIM (AC-02):</p>
                    <p className="mt-0.5">
                      NIM Anda tidak pernah dipublikasikan atau dikirim ke halaman publik. Data publik hanya disajikan lewat view aman.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
