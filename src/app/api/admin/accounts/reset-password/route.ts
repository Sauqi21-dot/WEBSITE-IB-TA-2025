import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

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

    if (!caller || caller.role !== "super_admin") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Super Admin yang berhak me-reset password akun." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { target_user_id } = body;

    if (!target_user_id) {
      return NextResponse.json({ error: "ID pengguna target wajib diisi." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Dapatkan data mahasiswa target
    const { data: targetProfile, error: getErr } = await adminSupabase
      .from("profiles")
      .select("id, nim, full_name")
      .eq("id", target_user_id)
      .single();

    if (getErr || !targetProfile) {
      return NextResponse.json({ error: "Pengguna target tidak ditemukan." }, { status: 404 });
    }

    // Generate random temporary password (e.g. IB26-xxxx)
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const tempPassword = `IB2026!${randomSuffix}`;

    // 1. Update password di auth.users Supabase
    const { error: authUpdateErr } = await adminSupabase.auth.admin.updateUserById(
      target_user_id,
      { password: tempPassword }
    );

    if (authUpdateErr) {
      return NextResponse.json(
        { error: `Gagal memperbarui password di auth: ${authUpdateErr.message}` },
        { status: 500 }
      );
    }

    // 2. Set must_change_password = true di tabel profiles
    const { error: profUpdateErr } = await adminSupabase
      .from("profiles")
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", target_user_id);

    if (profUpdateErr) {
      return NextResponse.json(
        { error: `Gagal memperbarui flag password di profile: ${profUpdateErr.message}` },
        { status: 500 }
      );
    }

    // 3. Catat ke activity_logs
    await adminSupabase.from("activity_logs").insert({
      user_id: user.id,
      action: "RESET_STUDENT_PASSWORD",
      target_table: "profiles",
      target_id: target_user_id,
      details: {
        target_name: targetProfile.full_name,
        target_nim: targetProfile.nim,
        by: caller.full_name,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password sementara untuk ${targetProfile.full_name} (${targetProfile.nim}) berhasil dibuat.`,
      tempPassword,
      studentName: targetProfile.full_name,
      studentNim: targetProfile.nim,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
