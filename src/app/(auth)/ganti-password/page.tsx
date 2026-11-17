"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function GantiPasswordPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>("");
  const [nim, setNim] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, nim, must_change_password")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name);
          setNim(profile.nim);
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side quick check
    if (newPassword.length < 8) {
      setError("Password baru harus memiliki panjang minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    if (nim && newPassword.trim() === nim.trim()) {
      setError("Password tidak boleh sama dengan NIM Anda demi keamanan.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengganti password.");
        setLoading(false);
        return;
      }

      setSuccess("Password berhasil diganti! Mengarahkan Anda ke profil...");
      setTimeout(() => {
        window.location.href = "/profil";
      }, 800);
    } catch (err: any) {
      setError("Terjadi kesalahan koneksi saat mengganti password.");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12">
        <div className="bg-white border border-ib-border p-6 md:p-8 rounded shadow-sm">
          {/* Header Kartu */}
          <div className="border-b border-ib-border pb-4 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-ib-accent bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Langkah Wajib
            </span>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-ib-dark mt-2">
              {initialLoading ? "Memuat Akun..." : `Halo, ${fullName || "Mahasiswa"}`}
            </h1>
            <p className="text-xs text-ib-text/75 mt-1">
              {nim ? `NPM: ${nim} · ` : ""}
              Demi keamanan akun kelas Anda, Anda wajib mengganti password default bersama dengan password pribadi sebelum dapat mengakses halaman lainnya.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 border border-ib-danger text-ib-danger rounded mb-4">
              <strong>Peringatan:</strong> {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-xs bg-emerald-50 border border-ib-action text-ib-action font-semibold rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-ib-text mb-1"
              >
                Password Baru
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-3 py-2 text-sm border border-ib-border rounded focus:outline-none focus:ring-2 focus:ring-ib-dark/40 bg-[#FCFAF5]"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-ib-text mb-1"
              >
                Ulangi Password Baru
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru Anda"
                className="w-full px-3 py-2 text-sm border border-ib-border rounded focus:outline-none focus:ring-2 focus:ring-ib-dark/40 bg-[#FCFAF5]"
              />
            </div>

            {/* Aturan Keamanan Password */}
            <div className="bg-[#F7F5EF] p-3 rounded border border-ib-border text-[11px] text-ib-text/80 space-y-1">
              <p className="font-semibold text-ib-dark">Ketentuan Password:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li className={newPassword.length >= 8 ? "text-ib-action font-semibold" : ""}>
                  Minimal 8 karakter
                </li>
                <li className={newPassword && nim && newPassword !== nim ? "text-ib-action font-semibold" : ""}>
                  Tidak boleh sama dengan NIM Anda
                </li>
                <li className={newPassword && confirmPassword && newPassword === confirmPassword ? "text-ib-action font-semibold" : ""}>
                  Konfirmasi password harus sesuai
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full btn-primary text-sm py-2.5 mt-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Menyimpan Password Baru..." : "Simpan Password & Masuk"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
