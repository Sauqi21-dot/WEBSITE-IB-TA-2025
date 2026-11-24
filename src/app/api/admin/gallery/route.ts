import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"];

export async function GET() {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    // Ambil semua item galeri
    const { data: items, error } = await supabase
      .from("gallery_items")
      .select(`
        id, title, caption, image_path, semester, category, taken_on,
        archived, created_at, uploaded_by,
        uploader:profiles!gallery_items_uploaded_by_fkey(full_name, nickname)
      `)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Upload Foto Baru atau Update Foto Eksisting (Ganti Gambar / Edit)
export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak: Hanya Admin yang dapat mengelola foto galeri." }, { status: 403 });
    }

    const formData = await request.formData();
    const existingId = formData.get("id") as string | null; // Jika ada, ini adalah mode EDIT
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const caption = (formData.get("caption") as string) || "";
    const semesterStr = formData.get("semester") as string;
    const category = (formData.get("category") as string) || "Dokumentasi Kuliah";
    const takenOn = (formData.get("taken_on") as string) || new Date().toISOString().split("T")[0];

    const semester = parseInt(semesterStr, 10) || 3;
    const adminSupabase = createAdminClient();

    // 1. Jika ada file foto baru yang diunggah
    let publicUrl: string | null = null;
    if (file && file.size > 0) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Format berkas tidak didukung. Harap gunakan format WebP, JPG, atau PNG." },
          { status: 400 }
        );
      }

      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Ukuran berkas melebihi batas 5 MB." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        await adminSupabase.storage.createBucket("gallery", {
          public: true,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: ALLOWED_TYPES,
        });
      } catch {
        // Bucket sudah ada
      }

      const fileExt = file.type === "image/webp" ? "webp" : file.type.split("/")[1] || "webp";
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await adminSupabase.storage
        .from("gallery")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Gagal upload gambar ke storage: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const urlData = adminSupabase.storage.from("gallery").getPublicUrl(filePath);
      publicUrl = urlData.data.publicUrl;
    }

    // 2. Mode EDIT item yang sudah ada
    if (existingId) {
      const updatePayload: Record<string, any> = {};
      if (title) updatePayload.title = title.trim();
      if (caption !== undefined) updatePayload.caption = caption.trim() || null;
      if (semester) updatePayload.semester = semester;
      if (category) updatePayload.category = category.trim();
      if (takenOn) updatePayload.taken_on = takenOn;
      if (publicUrl) updatePayload.image_path = publicUrl;

      const { data: updated, error: updateError } = await adminSupabase
        .from("gallery_items")
        .update(updatePayload)
        .eq("id", existingId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Log aktivitas
      await adminSupabase.from("activity_logs").insert({
        user_id: user.id,
        action: "UPDATE_GALLERY_ITEM",
        target_table: "gallery_items",
        target_id: existingId,
        details: {
          title: updated.title,
          image_changed: Boolean(publicUrl),
          by: caller.full_name,
        },
      });

      // On-demand revalidation galeri dan beranda
      revalidatePath("/galeri");
      revalidatePath("/");

      return NextResponse.json({
        success: true,
        message: publicUrl
          ? "Gambar foto dan informasi galeri berhasil diperbarui."
          : "Informasi foto galeri berhasil diperbarui.",
        item: updated,
      });
    }

    // 3. Mode INSERT foto baru
    if (!publicUrl) {
      return NextResponse.json({ error: "Berkas foto wajib diunggah untuk foto baru." }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Judul foto wajib diisi." }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await adminSupabase
      .from("gallery_items")
      .insert({
        title: title.trim(),
        caption: caption.trim() || null,
        image_path: publicUrl,
        semester,
        category: category.trim(),
        taken_on: takenOn,
        uploaded_by: user.id,
        archived: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log aktivitas
    await adminSupabase.from("activity_logs").insert({
      user_id: user.id,
      action: "UPLOAD_GALLERY_ITEM",
      target_table: "gallery_items",
      target_id: inserted.id,
      details: {
        title: title.trim(),
        semester,
        by: caller.full_name,
      },
    });

    // On-demand revalidation galeri dan beranda
    revalidatePath("/galeri");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Foto galeri berhasil diunggah (Format WebP tanpa EXIF).",
      item: inserted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Archive / toggle status
export async function PUT(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { id, archived, title, caption, is_featured } = body;

    if (!id) {
      return NextResponse.json({ error: "ID galeri wajib diisi." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (typeof archived === "boolean") updatePayload.archived = archived;
    if (typeof is_featured === "boolean") updatePayload.is_featured = is_featured;
    if (title !== undefined) updatePayload.title = title.trim();
    if (caption !== undefined) updatePayload.caption = caption.trim() || null;

    const adminSupabase = createAdminClient();
    const { data: updated, error } = await adminSupabase
      .from("gallery_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // On-demand revalidation galeri dan beranda
    revalidatePath("/galeri");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Status galeri berhasil diperbarui.",
      item: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
