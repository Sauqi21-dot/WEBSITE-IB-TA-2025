import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Ambil profil pemanggil untuk cek role
    const { data: callerProfile, error: callerError } = await supabase
      .from("profiles")
      .select("id, role, nim, full_name")
      .eq("id", user.id)
      .single();

    if (callerError || !callerProfile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const isSuperAdmin = callerProfile.role === "super_admin";

    // 1. KEAMANAN RLS: Mahasiswa A TIDAK BISA mengubah profil mahasiswa B
    if (body.target_id && body.target_id !== user.id && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda tidak memiliki izin mengubah profil mahasiswa lain." },
        { status: 403 }
      );
    }

    // 2. KEAMANAN RLS: Kolom terproteksi (role, can_manage_kas, is_active, nim, full_name)
    const protectedFields = ["role", "can_manage_kas", "is_active", "nim", "full_name"];
    const attemptedProtectedFields = protectedFields.filter(
      (field) => body[field] !== undefined
    );

    if (attemptedProtectedFields.length > 0 && !isSuperAdmin) {
      return NextResponse.json(
        {
          error: `Akses ditolak: Kolom [${attemptedProtectedFields.join(", ")}] tidak dapat diubah oleh mahasiswa. Hanya Ketua Kelas (Super Admin) yang berwenang.`,
          blockedFields: attemptedProtectedFields,
        },
        { status: 403 }
      );
    }

    // 3. Validasi batas wajar field yang diizinkan (FR-08)
    const updatePayload: Record<string, any> = {};

    if (body.nickname !== undefined) {
      updatePayload.nickname = body.nickname ? String(body.nickname).trim().slice(0, 50) : null;
    }

    if (body.bio !== undefined) {
      const trimmedBio = body.bio ? String(body.bio).trim() : null;
      if (trimmedBio && trimmedBio.length > 300) {
        return NextResponse.json(
          { error: "Bio maksimal 300 karakter." },
          { status: 400 }
        );
      }
      updatePayload.bio = trimmedBio;
    }

    // Tanggal dan bulan lahir (tanpa tahun)
    if (body.birthday_day !== undefined) {
      if (body.birthday_day === null || body.birthday_day === "") {
        updatePayload.birthday_day = null;
      } else {
        const day = parseInt(body.birthday_day, 10);
        if (isNaN(day) || day < 1 || day > 31) {
          return NextResponse.json(
            { error: "Tanggal ulang tahun harus antara 1 dan 31." },
            { status: 400 }
          );
        }
        updatePayload.birthday_day = day;
      }
    }

    if (body.birthday_month !== undefined) {
      if (body.birthday_month === null || body.birthday_month === "") {
        updatePayload.birthday_month = null;
      } else {
        const month = parseInt(body.birthday_month, 10);
        if (isNaN(month) || month < 1 || month > 12) {
          return NextResponse.json(
            { error: "Bulan ulang tahun harus antara 1 dan 12." },
            { status: 400 }
          );
        }
        updatePayload.birthday_month = month;
      }
    }

    if (body.photo_public !== undefined) {
      updatePayload.photo_public = Boolean(body.photo_public);
    }

    if (body.birthday_public !== undefined) {
      updatePayload.birthday_public = Boolean(body.birthday_public);
    }

    // Jika Super Admin yang mengubah data resmi
    if (isSuperAdmin) {
      if (body.full_name !== undefined) updatePayload.full_name = String(body.full_name).trim();
      if (body.nim !== undefined) updatePayload.nim = String(body.nim).trim();
      if (body.role !== undefined) updatePayload.role = body.role;
      if (body.can_manage_kas !== undefined) updatePayload.can_manage_kas = Boolean(body.can_manage_kas);
      if (body.is_active !== undefined) updatePayload.is_active = Boolean(body.is_active);
    }

    const targetUserId = (isSuperAdmin && body.target_id) ? body.target_id : user.id;

    // 4. Eksekusi UPDATE dengan RLS Supabase
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", targetUserId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Gagal memperbarui profil di database." },
        { status: 500 }
      );
    }

    // 5. Catat aktivitas di activity_logs
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "UPDATE_PROFILE",
      target_table: "profiles",
      target_id: targetUserId,
      details: {
        updatedFields: Object.keys(updatePayload),
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profil Anda berhasil diperbarui.",
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
