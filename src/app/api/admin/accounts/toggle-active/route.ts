import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
        { error: "Akses ditolak: Hanya Super Admin yang berwenang mengaktifkan atau menonaktifkan akun." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { target_user_id, is_active } = body;

    if (!target_user_id) {
      return NextResponse.json({ error: "ID pengguna target wajib diisi." }, { status: 400 });
    }

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "Nilai is_active harus berupa boolean." }, { status: 400 });
    }

    // Gunakan admin client untuk bypass RLS trigger jika diperlukan atau update via service role
    const adminSupabase = createAdminClient();

    const { data: updatedProfile, error: updateErr } = await adminSupabase
      .from("profiles")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", target_user_id)
      .select("id, nim, full_name, is_active")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Catat ke activity_logs
    await adminSupabase.from("activity_logs").insert({
      user_id: user.id,
      action: is_active ? "ACTIVATE_ACCOUNT" : "DEACTIVATE_ACCOUNT",
      target_table: "profiles",
      target_id: target_user_id,
      details: {
        target_name: updatedProfile.full_name,
        target_nim: updatedProfile.nim,
        is_active,
        by: caller.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${updatedProfile.full_name} (${updatedProfile.nim}) berhasil di${is_active ? "aktifkan" : "nonaktifkan"}.`,
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
