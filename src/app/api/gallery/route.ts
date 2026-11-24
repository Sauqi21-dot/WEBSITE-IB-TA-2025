import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];

/**
 * POST /api/gallery
 * Mengunggah foto baru oleh akun login yang aktif (mahasiswa, admin, super_admin).
 * uploaded_by diisi otomatis dari id sesi pengguna.
 * File disimpan di folder storage bernama id pengguna: `${user.id}/${Date.now()}-...webp`.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (!caller || caller.is_active === false) {
      return NextResponse.json(
        { error: "Akun Anda tidak aktif atau tidak memiliki akses." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const caption = (formData.get("caption") as string) || "";
    const semester = parseInt((formData.get("semester") as string) || "1", 10);
    const category = (formData.get("category") as string) || "Dokumentasi Kuliah";
    const takenOn = (formData.get("taken_on") as string) || new Date().toISOString().split("T")[0];

    if (!file) {
      return NextResponse.json(
        { error: "Berkas foto wajib diunggah." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format berkas tidak didukung. Harap gunakan JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ukuran berkas melebihi batas maksimal 5 MB." },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Judul foto wajib diisi." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = file.type === "image/webp" ? "webp" : file.type.split("/")[1] || "webp";
    // Folder storage dinamai id pengguna sendiri untuk menegakkan Storage RLS
    const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from("gallery")
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

    const { data: urlData } = adminSupabase.storage.from("gallery").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Simpan ke database dengan uploaded_by dari user.id
    const { data: inserted, error: insertError } = await supabase
      .from("gallery_items")
      .insert({
        title: title.trim(),
        caption: caption.trim() || null,
        image_path: publicUrl,
        semester: isNaN(semester) ? 1 : semester,
        category: category.trim(),
        taken_on: takenOn,
        uploaded_by: user.id, // Sesi id
        is_featured: false,   // Non-admin dilarang set featured
        archived: false,
      })
      .select(`
        id, title, caption, image_path, semester, category, taken_on, is_featured, archived, uploaded_by,
        uploader:profiles(id, full_name, nickname)
      `)
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Gagal menyimpan data foto: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Catat log aktivitas
    try {
      await adminSupabase.from("activity_logs").insert({
        user_id: user.id,
        action: "UPLOAD_GALLERY_PHOTO",
        target_table: "gallery_items",
        target_id: inserted.id,
        details: {
          title: title.trim(),
          semester,
          by: caller.full_name,
          role: caller.role,
        },
      });
    } catch {}

    revalidatePath("/galeri");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Foto berhasil ditambahkan ke galeri.",
      item: inserted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gallery
 * Mengedit metadata foto atau mengarsipkan/membatalkan arsip foto.
 * Mahasiswa hanya berhak untuk foto miliknya sendiri (uploaded_by = user.id).
 * Admin dan Super Admin berhak untuk semua foto.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (!caller || caller.is_active === false) {
      return NextResponse.json(
        { error: "Akun Anda tidak aktif atau tidak memiliki akses." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, title, caption, semester, category, taken_on, archived } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID foto wajib disertakan." },
        { status: 400 }
      );
    }

    // Ambil data foto saat ini
    const { data: currentItem, error: fetchErr } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !currentItem) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan." },
        { status: 404 }
      );
    }

    const isAdmin = caller.role === "admin" || caller.role === "super_admin";
    const isOwner = currentItem.uploaded_by === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda hanya dapat mengelola foto yang Anda unggah sendiri." },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, any> = {};
    if (title !== undefined) updatePayload.title = String(title).trim();
    if (caption !== undefined) updatePayload.caption = caption ? String(caption).trim() : null;
    if (semester !== undefined) {
      const numSem = parseInt(semester, 10);
      if (!isNaN(numSem)) updatePayload.semester = numSem;
    }
    if (category !== undefined) updatePayload.category = String(category).trim();
    if (taken_on !== undefined) updatePayload.taken_on = taken_on;
    if (typeof archived === "boolean") updatePayload.archived = archived;

    const { data: updated, error: updateErr } = await supabase
      .from("gallery_items")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id, title, caption, image_path, semester, category, taken_on, is_featured, archived, uploaded_by,
        uploader:profiles(id, full_name, nickname)
      `)
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    revalidatePath("/galeri");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: typeof archived === "boolean"
        ? (archived ? "Foto berhasil diarsipkan." : "Foto berhasil dipulihkan dari arsip.")
        : "Informasi foto berhasil diperbarui.",
      item: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gallery
 * Menghapus foto secara permanen. HANYA untuk Admin dan Super Admin.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 }
      );
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya admin yang dapat menghapus foto secara permanen. Gunakan fitur Arsipkan untuk menyembunyikan foto." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID foto wajib disertakan." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error: delErr } = await adminSupabase
      .from("gallery_items")
      .delete()
      .eq("id", id);

    if (delErr) {
      return NextResponse.json(
        { error: delErr.message },
        { status: 500 }
      );
    }

    revalidatePath("/galeri");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Foto berhasil dihapus secara permanen.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
