"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // Reset state seketika agar tidak menampilkan sisa data lama
    setProfile(null);
    setProfileLoadError(false);
    setLoading(true);

    async function fetchProfile(userId: string) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 300));
          }
          if (!mounted) return;
          const { data, error } = await supabase
            .from("profiles")
            .select("id, nim, full_name, nickname, photo_path, role, position")
            .eq("id", userId)
            .single();

          if (!mounted) return;
          if (data) {
            setProfile(data);
            setLoading(false);
            return;
          }
          if (error) {
            console.warn(`[Navbar] fetchProfile attempt ${attempt + 1} gagal:`, error.message);
          }
        } catch (err) {
          console.warn(`[Navbar] fetchProfile attempt ${attempt + 1} error:`, err);
        }
      }
      if (mounted) {
        setProfileLoadError(true);
        setLoading(false);
      }
    }

    // 1. Periksa sesi aktif saat mount/navigasi
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      if (user) {
        fetchProfile(user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Dengarkan event auth realtime (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setProfile(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        fetchProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      setProfile(null);
      setLoading(true);
      // Hapus sesi di server (cookie dihapus oleh API route)
      await fetch("/api/auth/logout", { method: "POST" });
      // Hapus sesi di client
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      // Hard redirect — React tree di-unmount sepenuhnya, tidak ada state yang tersisa
      window.location.href = "/login";
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
    <header className="border-b border-ib-border bg-ib-bg sticky top-0 z-40">
      {/* Masthead Header */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-ib-border">
        <div>
          <div className="flex items-baseline gap-3">
            <Link href="/" className="font-serif text-2xl md:text-3xl font-bold text-ib-text tracking-tight hover:text-ib-action transition">
              IB 2025
            </Link>
            <span className="text-xs uppercase tracking-widest text-ib-muted">
              MIVIBESS 25
            </span>
          </div>
          <p className="text-xs text-ib-muted mt-0.5">
            D3 Manajemen Informatika · Polsri · Angkatan 2025
          </p>
        </div>

        {/* User status */}
        <div className="flex items-center gap-3 text-sm min-h-[32px]">
          {loading ? (
            /* Kerangka / skeleton saat profil sedang dimuat */
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-ib-border" />
              <div className="space-y-1 hidden sm:block">
                <div className="w-16 h-3 bg-ib-border rounded" />
                <div className="w-10 h-2 bg-ib-border rounded" />
              </div>
            </div>
          ) : profileLoadError ? (
            <span className="text-xs text-ib-danger font-medium">
              Profil tidak dapat dimuat.{" "}
              <button onClick={() => window.location.reload()} className="underline">
                Muat ulang
              </button>
            </span>
          ) : profile ? (
            <div className="flex items-center gap-3">
              {/* Item 2: Klik foto/nama membuka /profil */}
              <Link
                href="/profil"
                className="flex items-center gap-2.5 hover:text-ib-action transition group"
                title="Buka Profil Saya"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-ib-border text-ib-text flex items-center justify-center font-serif text-xs flex-shrink-0">
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
                  <span className="font-semibold text-xs sm:text-sm text-ib-text group-hover:text-ib-action leading-tight block">
                    {displayName}
                  </span>
                  {profile.position ? (
                    <span className="text-[10px] text-ib-muted block leading-none">
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
          ) : (
            <Link
              href="/login"
              className="btn-primary text-xs py-1.5 px-4"
            >
              Login NPM
            </Link>
          )}
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
                      ? "text-ib-text font-bold border-b-2 border-ib-text"
                      : "text-ib-muted hover:text-ib-action"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {!loading && profile && (
          <div className="flex items-center gap-4 text-xs font-semibold pl-4">
            {(profile.role === "admin" || profile.role === "super_admin") && (
              <Link
                href="/admin"
                className="text-ib-text hover:text-ib-action"
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
