import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * POST /api/kas/periods
 * Membuat periode iuran kas baru oleh Bendahara (can_manage_kas) atau Super Admin.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, can_manage_kas")
      .eq("id", user.id)
      .single();

    if (!profile || (!profile.can_manage_kas && profile.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Bendahara atau Ketua yang dapat membuat periode kas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { label, amount, due_date } = body;

    if (!label || !label.trim()) {
      return NextResponse.json({ error: "Nama periode wajib diisi." }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ error: "Nominal iuran tidak valid." }, { status: 400 });
    }

    if (!due_date) {
      return NextResponse.json({ error: "Tenggat waktu (due date) wajib diisi." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("kas_periods")
      .insert({
        label: label.trim(),
        amount: numAmount,
        due_date,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Periode '${label.trim()}' berhasil dibuat.`,
      period: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
