import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

/**
 * GET /api/admin/history
 * Mengambil daftar riwayat kelas per semester untuk admin panel.
 */
export async function GET() {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401, headers: noStoreHeaders });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak: Hanya admin yang dapat mengakses riwayat kelas." }, { status: 403, headers: noStoreHeaders });
    }

    const { data, error } = await supabase
      .from("class_history")
      .select("*")
      .order("semester", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
    }

    return NextResponse.json({ success: true, history: data || [] }, { headers: noStoreHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500, headers: noStoreHeaders });
  }
}

/**
 * POST /api/admin/history
 * Menambah semester baru ke riwayat kelas oleh Admin / Super Admin.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401, headers: noStoreHeaders });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak: Hanya admin yang dapat menambah riwayat kelas." }, { status: 403, headers: noStoreHeaders });
    }

    const body = await request.json();
    const { semester, class_name, period, summary } = body;

    const numSemester = parseInt(semester, 10);
    if (isNaN(numSemester) || numSemester < 1 || numSemester > 10) {
      return NextResponse.json({ error: "Nomor semester harus berupa angka antara 1 sampai 10." }, { status: 400, headers: noStoreHeaders });
    }

    if (!class_name || typeof class_name !== "string" || !class_name.trim()) {
      return NextResponse.json({ error: "Nama kelas wajib diisi (contoh: 4IB)." }, { status: 400, headers: noStoreHeaders });
    }

    if (!period || typeof period !== "string" || !period.trim()) {
      return NextResponse.json({ error: "Periode semester wajib diisi (contoh: Genap 2025 / 2026)." }, { status: 400, headers: noStoreHeaders });
    }

    // Cek duplikasi semester
    const { data: existing } = await supabase
      .from("class_history")
      .select("id")
      .eq("semester", numSemester)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Semester ${numSemester} sudah terdaftar. Gunakan menu Edit untuk mengubahnya.` }, { status: 400, headers: noStoreHeaders });
    }

    const cleanSummary = summary && typeof summary === "string" ? summary.trim() : null;

    const { data, error } = await supabase
      .from("class_history")
      .insert({
        semester: numSemester,
        class_name: class_name.trim(),
        period: period.trim(),
        summary: cleanSummary,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
    }

    // Catat ke activity_logs
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "CREATE_CLASS_HISTORY",
      target_table: "class_history",
      target_id: String(data.id),
      details: {
        semester: numSemester,
        class_name: class_name.trim(),
        period: period.trim(),
        summary: cleanSummary,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Riwayat Semester ${numSemester} (${class_name.trim()}) berhasil ditambahkan.`,
      history: data,
    }, { headers: noStoreHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500, headers: noStoreHeaders });
  }
}

/**
 * PATCH /api/admin/history
 * Mengedit data riwayat semester (nama kelas, periode, ringkasan).
 */
export async function PATCH(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401, headers: noStoreHeaders });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak: Hanya admin yang dapat mengedit riwayat kelas." }, { status: 403, headers: noStoreHeaders });
    }

    const body = await request.json();
    const { id, class_name, period, summary } = body;

    if (!id) {
      return NextResponse.json({ error: "ID riwayat kelas wajib disertakan." }, { status: 400, headers: noStoreHeaders });
    }

    const { data: oldData, error: fetchErr } = await supabase
      .from("class_history")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !oldData) {
      return NextResponse.json({ error: "Data riwayat kelas tidak ditemukan." }, { status: 404, headers: noStoreHeaders });
    }

    const updatePayload: Record<string, any> = {};

    if (class_name !== undefined) {
      const cleanClassName = String(class_name).trim();
      if (!cleanClassName) {
        return NextResponse.json({ error: "Nama kelas tidak boleh kosong." }, { status: 400, headers: noStoreHeaders });
      }
      updatePayload.class_name = cleanClassName;
    }

    if (period !== undefined) {
      const cleanPeriod = String(period).trim();
      if (!cleanPeriod) {
        return NextResponse.json({ error: "Periode semester tidak boleh kosong." }, { status: 400, headers: noStoreHeaders });
      }
      updatePayload.period = cleanPeriod;
    }

    if (summary !== undefined) {
      updatePayload.summary = summary ? String(summary).trim() : null;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("class_history")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500, headers: noStoreHeaders });
    }

    // Catat ke activity_logs
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "UPDATE_CLASS_HISTORY",
      target_table: "class_history",
      target_id: String(id),
      details: {
        semester: oldData.semester,
        old: { class_name: oldData.class_name, period: oldData.period, summary: oldData.summary },
        new: { class_name: updated.class_name, period: updated.period, summary: updated.summary },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Riwayat Semester ${oldData.semester} berhasil diperbarui.`,
      history: updated,
    }, { headers: noStoreHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500, headers: noStoreHeaders });
  }
}
