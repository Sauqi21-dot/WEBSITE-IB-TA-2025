import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClientServer } from "@/lib/supabase/server";

// ─── Helpers validasi URL sosial ───────────────────────────────────────────

/**
 * Normalisasi Instagram: terima username (dengan/tanpa @) atau URL profil.
 * Simpan sebagai https://instagram.com/<user>.
 * Hostname harus tepat instagram.com atau www.instagram.com.
 */
function parseInstagramUrl(raw: string): string {
  const val = raw.trim();
  if (!val) return "";

  // Jika input adalah username (tidak mengandung "://")
  if (!val.includes("://")) {
    const username = val.replace(/^@/, "").trim();
    if (!username || username.length > 30 || !/^[\w.]+$/.test(username)) {
      throw new Error("Username Instagram tidak valid.");
    }
    return `https://instagram.com/${username}`;
  }

  // Jika berupa URL lengkap
  let url: URL;
  try {
    url = new URL(val);
  } catch {
    throw new Error("URL Instagram tidak valid.");
  }
  if (url.protocol !== "https:") {
    throw new Error("URL Instagram harus menggunakan https.");
  }
  // Hostname harus tepat instagram.com atau www.instagram.com (cegah subdomain injection)
  if (url.hostname !== "instagram.com" && url.hostname !== "www.instagram.com") {
    throw new Error("Hostname URL Instagram harus instagram.com atau www.instagram.com.");
  }
  // Pastikan tidak ada user:password@ (URL.username berisi bagian sebelum @)
  if (url.username || url.password) {
    throw new Error("URL Instagram tidak boleh mengandung user:password@.");
  }
  const pathParts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (pathParts.length === 0) {
    throw new Error("URL Instagram harus menyertakan username di path.");
  }
  const username = pathParts[0];
  if (!/^[\w.]+$/.test(username)) {
    throw new Error("Username Instagram tidak valid.");
  }
  return `https://instagram.com/${username}`;
}

/**
 * Validasi LinkedIn: URL profil dengan hostname tepat linkedin.com atau www.linkedin.com
 * dan path /in/<handle>.
 */
function parseLinkedinUrl(raw: string): string {
  const val = raw.trim();
  if (!val) return "";

  let url: URL;
  try {
    url = new URL(val);
  } catch {
    throw new Error("URL LinkedIn tidak valid.");
  }
  if (url.protocol !== "https:") {
    throw new Error("URL LinkedIn harus menggunakan https.");
  }
  if (url.hostname !== "linkedin.com" && url.hostname !== "www.linkedin.com") {
    throw new Error("Hostname URL LinkedIn harus linkedin.com atau www.linkedin.com.");
  }
  if (url.username || url.password) {
    throw new Error("URL LinkedIn tidak boleh mengandung user:password@.");
  }
  const pathParts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (pathParts.length < 2 || pathParts[0] !== "in") {
    throw new Error("URL LinkedIn harus dalam format linkedin.com/in/<handle>.");
  }
  const handle = pathParts[1];
  if (!handle || handle.length < 3 || handle.length > 100) {
    throw new Error("Handle LinkedIn tidak valid.");
  }
  return `https://linkedin.com/in/${handle}`;
}

/**
 * Validasi website pribadi: wajib https, hostname valid, tanpa user:password@,
 * panjang maks 200, tolak javascript:, data:, http:.
 */
function parseWebsiteUrl(raw: string): string {
  const val = raw.trim();
  if (!val) return "";

  // Tolak scheme berbahaya sebelum parsing
  const lower = val.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    throw new Error("Scheme URL website tidak diizinkan.");
  }
  if (lower.startsWith("http:") && !lower.startsWith("https:")) {
    throw new Error("URL website harus menggunakan https (bukan http).");
  }

  let url: URL;
  try {
    url = new URL(val);
  } catch {
    throw new Error("URL website tidak valid.");
  }

  if (url.protocol !== "https:") {
    throw new Error("URL website harus menggunakan https.");
  }
  if (url.username || url.password) {
    throw new Error("URL website tidak boleh mengandung user:password@.");
  }
  // Hostname harus punya setidaknya satu titik (domain valid)
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
    throw new Error("Hostname URL website tidak valid.");
  }
  if (val.length > 200) {
    throw new Error("URL website maksimal 200 karakter.");
  }
  return val;
}

// ───────────────────────────────────────────────────────────────────────────

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

    // 2. KEAMANAN RLS: Kolom terproteksi (role, is_active, nim, full_name)
    const protectedFields = ["role", "is_active", "nim", "full_name"];
    const attemptedProtectedFields = protectedFields.filter(
      (field) => body[field] !== undefined
    );

    if (attemptedProtectedFields.length > 0 && !isSuperAdmin) {
      return NextResponse.json(
        {
          error: `Akses ditolak: Kolom [${attemptedProtectedFields.join(", ")}] tidak dapat diubah oleh mahasiswa. Hanya Super Admin yang berwenang.`,
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

    // Tautan sosial opsional
    if (body.instagram_url !== undefined) {
      if (!body.instagram_url) {
        updatePayload.instagram_url = null;
      } else {
        try {
          const parsed = parseInstagramUrl(String(body.instagram_url));
          updatePayload.instagram_url = parsed || null;
        } catch (e: any) {
          return NextResponse.json({ error: `Instagram: ${e.message}` }, { status: 400 });
        }
      }
    }

    if (body.linkedin_url !== undefined) {
      if (!body.linkedin_url) {
        updatePayload.linkedin_url = null;
      } else {
        try {
          const parsed = parseLinkedinUrl(String(body.linkedin_url));
          updatePayload.linkedin_url = parsed || null;
        } catch (e: any) {
          return NextResponse.json({ error: `LinkedIn: ${e.message}` }, { status: 400 });
        }
      }
    }

    if (body.website_url !== undefined) {
      if (!body.website_url) {
        updatePayload.website_url = null;
      } else {
        try {
          const parsed = parseWebsiteUrl(String(body.website_url));
          updatePayload.website_url = parsed || null;
        } catch (e: any) {
          return NextResponse.json({ error: `Website: ${e.message}` }, { status: 400 });
        }
      }
    }

    // Jika Super Admin yang mengubah data resmi
    if (isSuperAdmin) {
      if (body.full_name !== undefined) updatePayload.full_name = String(body.full_name).trim();
      if (body.nim !== undefined) updatePayload.nim = String(body.nim).trim();
      if (body.role !== undefined) updatePayload.role = body.role;
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

    // 6. On-demand revalidation untuk halaman publik yang menampilkan data mahasiswa
    revalidatePath("/mahasiswa");
    revalidatePath("/ulang-tahun");
    revalidatePath("/");

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
