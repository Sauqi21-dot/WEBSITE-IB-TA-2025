import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { validateNewPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPassword, confirmPassword } = body;

    // Ambil data profil untuk validasi terhadap NIM
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nim, full_name, must_change_password")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validasi aturan password (FR-07)
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
    const validation = validateNewPassword({
      newPassword,
      confirmPassword,
      nim: profile.nim,
      defaultPassword,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 1. Update password di Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateAuthError) {
      return NextResponse.json(
        { error: `Gagal memperbarui password: ${updateAuthError.message}` },
        { status: 500 }
      );
    }

    // 2. Set must_change_password = false di public.profiles
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (updateProfileError) {
      return NextResponse.json(
        { error: `Gagal memperbarui status profil: ${updateProfileError.message}` },
        { status: 500 }
      );
    }

    // 3. Catat aktivitas di activity_logs (AC-15)
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CHANGE_PASSWORD",
      target_table: "profiles",
      target_id: user.id,
      details: {
        note: "Mahasiswa berhasil mengganti password.",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password Anda berhasil diperbarui. Silakan lanjut menjelajah.",
      redirectTo: "/profil",
    });
  } catch (error: any) {
    console.error("Ganti password error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
