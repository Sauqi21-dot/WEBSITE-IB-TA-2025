import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { nimToEmail } from "@/lib/auth";
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nim, password } = body;

    if (!nim || !password) {
      return NextResponse.json(
        { error: "NIM dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanNim = String(nim).trim().replace(/\s+/g, "");

    // 1. Rate Limiting Check (FR-07)
    const rateLimit = checkLoginRateLimit(cleanNim);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login yang gagal. Akun dikunci sementara. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const supabase = createClientServer();
    const internalEmail = nimToEmail(cleanNim);

    // 2. Autentikasi dengan Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (authError || !authData.user) {
      recordFailedLogin(cleanNim);
      return NextResponse.json(
        {
          error: "NIM atau password salah. Pastikan NIM terdaftar di kelas IB 2025.",
        },
        { status: 401 }
      );
    }

    // 3. Reset rate limit setelah login sukses
    resetLoginAttempts(cleanNim);

    // 4. Periksa profil mahasiswa di database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nim, full_name, nickname, role, is_active, must_change_password, position")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Data profil mahasiswa tidak ditemukan di database." },
        { status: 404 }
      );
    }

    // 5. Cek status keaktifan akun (AC-05)
    // Akun nonaktif sampai hari aktivasi kelas
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Akun Anda berstatus NONAKTIF sampai hari aktivasi kelas. Silakan hubungi Ketua Kelas (M. Zidal Muttaqin) untuk aktivasi sesi.",
          inactive: true,
        },
        { status: 403 }
      );
    }

    // 6. Return response dengan tujuan redirect
    const redirectTo = profile.must_change_password ? "/ganti-password" : "/profil";

    return NextResponse.json({
      success: true,
      message: `Selamat datang, ${profile.full_name}`,
      profile: {
        id: profile.id,
        nim: profile.nim,
        full_name: profile.full_name,
        nickname: profile.nickname,
        role: profile.role,
        position: profile.position,
        must_change_password: profile.must_change_password,
      },
      redirectTo,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
