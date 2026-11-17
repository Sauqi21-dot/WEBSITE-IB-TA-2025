import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Berkas foto wajib diunggah." },
        { status: 400 }
      );
    }

    // 1. Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format berkas tidak didukung. Harap gunakan format JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    // 2. Validasi batas ukuran 2 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ukuran berkas melebihi 2 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload ke bucket "avatars" di Storage
    // Gunakan admin client untuk menjamin ketersediaan bucket
    const adminSupabase = createAdminClient();

    // Pastikan bucket avatars ada (public)
    try {
      await adminSupabase.storage.createBucket("avatars", {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: ALLOWED_TYPES,
      });
    } catch {
      // Abaikan jika bucket sudah ada
    }

    const fileExt = file.type === "image/webp" ? "webp" : file.type.split("/")[1] || "webp";
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Gagal mengunggah foto ke storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 4. Dapatkan Public URL
    const {
      data: { publicUrl },
    } = adminSupabase.storage.from("avatars").getPublicUrl(filePath);

    // 5. Perbarui path foto di tabel profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ photo_path: publicUrl })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        { error: `Gagal memperbarui profil: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Catat log aktivitas
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "UPDATE_AVATAR",
      target_table: "profiles",
      target_id: user.id,
      details: {
        photo_path: publicUrl,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Foto profil berhasil diperbarui.",
      photo_path: publicUrl,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal saat unggah foto." },
      { status: 500 }
    );
  }
}
