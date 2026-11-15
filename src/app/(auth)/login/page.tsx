"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");

  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [inactiveNotice, setInactiveNotice] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInactiveNotice(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.inactive) {
          setInactiveNotice(true);
        }
        setError(data.error || "Gagal masuk. Periksa NIM dan password Anda.");
        setLoading(false);
        return;
      }

      // Berhasil login: gunakan full navigation agar sesi dan middleware tersinkron sempurna
      const targetUrl = data.redirectTo || "/profil";
      window.location.href = targetUrl;
    } catch {
      setError("Terjadi gangguan koneksi. Silakan periksa jaringan Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-ib-border p-6 md:p-8 rounded shadow-sm">
      {/* Header Kartu */}
      <div className="border-b border-ib-border pb-4 mb-6">
        <span className="text-xs uppercase tracking-wider font-semibold text-ib-action">
          Portal Mahasiswa
        </span>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-ib-dark mt-1">
          Masuk dengan NIM
        </h1>
        <p className="text-xs text-ib-text/70 mt-1">
          Gunakan NIM resmi Anda (contoh: 062530801574) untuk mengakses profil dan kas kelas.
        </p>
      </div>

      {/* Notifikasi Error / Inactive */}
      {error && (
        <div
          className={`p-3 text-sm rounded mb-4 border ${
            inactiveNotice
              ? "bg-amber-50 border-ib-accent text-ib-text"
              : "bg-red-50 border-ib-danger text-ib-danger"
          }`}
        >
          <p className="font-semibold">{inactiveNotice ? "Perhatian Aktivasi:" : "Gagal Masuk:"}</p>
          <p className="text-xs mt-0.5">{error}</p>
          {inactiveNotice && (
            <div className="mt-2 text-xs text-ib-text/80 bg-white/70 p-2 rounded border border-amber-200">
              <p>
                <strong>Kebijakan Keamanan (AC-05):</strong> Semua 24 akun mahasiswa dibuat berstatus nonaktif dan baru diaktifkan serentak pada sesi kelas bersama Ketua Kelas (M. Zidal Muttaqin).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formulir Login */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="nim"
            className="block text-xs font-semibold uppercase tracking-wider text-ib-text mb-1"
          >
            Nomor Induk Mahasiswa (NIM)
          </label>
          <input
            id="nim"
            type="text"
            required
            value={nim}
            onChange={(e) => setNim(e.target.value)}
            placeholder="Contoh: 062530801587"
            className="w-full px-3 py-2 text-sm border border-ib-border rounded focus:outline-none focus:ring-2 focus:ring-ib-dark/40 bg-[#FCFAF5]"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-ib-text mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password Anda"
            className="w-full px-3 py-2 text-sm border border-ib-border rounded focus:outline-none focus:ring-2 focus:ring-ib-dark/40 bg-[#FCFAF5]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-sm py-2.5 mt-2 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Memproses Autentikasi..." : "Masuk ke Akun"}
        </button>
      </form>

      {/* Catatan Sesi dan Lupa Password */}
      <div className="mt-6 pt-4 border-t border-ib-border text-xs text-ib-text/75 space-y-2">
        <p>
          <strong>Login Pertama?</strong> Anda akan langsung diarahkan untuk mengganti password bawaan dengan password pribadi Anda sebelum bisa membuka halaman lain.
        </p>
        <p>
          <strong>Lupa Password?</strong> Sistem tidak menggunakan email publik. Silakan hubungi Ketua Kelas (M. Zidal Muttaqin) untuk mereset akun Anda.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12">
        <Suspense
          fallback={
            <div className="bg-white border border-ib-border p-8 rounded text-center text-sm text-ib-text/70 animate-pulse">
              Memuat halaman masuk...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-ib-action hover:underline font-semibold">
            &larr; Kembali ke Beranda Publik
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
