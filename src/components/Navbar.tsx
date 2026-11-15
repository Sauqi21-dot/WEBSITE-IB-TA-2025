"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  nim: string;
  full_name: string;
  nickname: string | null;
  role: string;
  position: string | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("id, nim, full_name, nickname, role, position")
            .eq("id", user.id)
            .single();
          if (data) setProfile(data);
        }
      } catch {
        // Ignored if client not ready
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = createClient();
      await supabase.auth.signOut();
      setProfile(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navLinks = [
    { href: "/", label: "Beranda" },
    { href: "/mahasiswa", label: "Mahasiswa" },
    { href: "/jadwal", label: "Jadwal" },
    { href: "/galeri", label: "Galeri" },
    { href: "/ulang-tahun", label: "Ulang Tahun" },
  ];

  return (
    <header className="border-b border-ib-border bg-[#F7F5EF] sticky top-0 z-40">
      {/* Masthead Header */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-ib-border/60">
        <div>
          <div className="flex items-baseline gap-3">
            <Link href="/" className="font-serif text-2xl md:text-3xl font-bold text-ib-dark tracking-tight hover:opacity-90 transition">
              IB 2025
            </Link>
            <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 bg-[#E7E3D5] text-ib-dark rounded">
              IB JOSJIS
            </span>
          </div>
          <p className="text-xs text-ib-text/75 mt-0.5">
            D3 Manajemen Informatika · Polsri · Angkatan 2025
          </p>
        </div>

        {/* User status */}
        <div className="flex items-center gap-3 text-sm">
          {!loading && profile ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-ib-text/70">Masuk sebagai</p>
                <p className="font-semibold text-ib-dark leading-tight">
                  {profile.nickname || profile.full_name}
                  {profile.position ? (
                    <span className="ml-1 text-[11px] font-normal text-ib-accent font-sans">
                      ({profile.position})
                    </span>
                  ) : null}
                </p>
              </div>
              <Link
                href="/profil"
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Profil Saya
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-ib-danger hover:underline font-semibold px-2 py-1"
              >
                Logout
              </button>
            </div>
          ) : !loading ? (
            <Link
              href="/login"
              className="btn-primary text-xs py-1.5 px-4"
            >
              Login NIM
            </Link>
          ) : null}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="max-w-6xl mx-auto px-4 flex items-center justify-between overflow-x-auto text-sm py-2">
        <ul className="flex items-center gap-6 font-medium text-ib-text">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`transition-colors pb-1 inline-block ${
                    isActive
                      ? "text-ib-dark font-bold border-b-2 border-ib-dark"
                      : "hover:text-ib-action"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {profile && (
          <div className="flex items-center gap-4 text-xs font-semibold pl-4">
            <Link
              href="/kas"
              className={`hover:text-ib-action ${pathname.startsWith("/kas") ? "text-ib-dark underline" : "text-ib-text/80"}`}
            >
              Kas Kelas
            </Link>
            {(profile.role === "admin" || profile.role === "super_admin") && (
              <Link
                href="/admin"
                className="text-ib-dark bg-[#E4DFC8] px-2 py-0.5 rounded hover:bg-[#D9D3BA]"
              >
                Panel Admin
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
