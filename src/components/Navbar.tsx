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
  photo_path: string | null;
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
            .select("id, nim, full_name, nickname, photo_path, role, position")
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

  const displayName = profile
    ? profile.nickname || profile.full_name.trim().split(" ")[0]
    : "";
  const initials = profile
    ? (profile.nickname || profile.full_name).trim().slice(0, 2).toUpperCase()
    : "";

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
              {/* Item 2: Klik foto/nama membuka /profil */}
              <Link
                href="/profil"
                className="flex items-center gap-2.5 hover:opacity-85 transition group"
                title="Buka Profil Saya"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-ib-dark text-white flex items-center justify-center font-serif font-bold text-xs border border-ib-border flex-shrink-0 group-hover:border-ib-action">
                  {profile.photo_path ? (
                    <img
                      src={profile.photo_path}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="text-left">
                  <span className="font-semibold text-xs sm:text-sm text-ib-dark group-hover:text-ib-action leading-tight block">
                    {displayName}
                  </span>
                  {profile.position ? (
                    <span className="text-[10px] text-ib-accent block leading-none">
                      {profile.position}
                    </span>
                  ) : null}
                </div>
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
              Login NPM
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
