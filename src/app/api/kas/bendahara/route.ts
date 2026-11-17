import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * GET /api/kas/bendahara
 * Hanya bendahara (can_manage_kas) atau super_admin.
 * Mengembalikan:
 * - Semua transaksi (dengan nama student)
 * - Semua profil mahasiswa (untuk checklist)
 * - Semua periode
 */
export async function GET() {
  try {
    const supabase = createClientServer();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
    }

    // Cek permission
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, can_manage_kas")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    }

    const hasAccess = profile.can_manage_kas || profile.role === "super_admin";
    if (!hasAccess) {
      return NextResponse.json({ error: "Akses ditolak: Hanya bendahara atau ketua." }, { status: 403 });
    }

    // Semua transaksi dengan nama mahasiswa
    const { data: transactions, error: txErr } = await supabase
      .from("kas_transactions")
      .select(`
        id, type, amount, category, occurred_on, description,
        proof_path, voided_at, void_reason, void_reason,
        recorded_by, created_at, student_id,
        student:profiles!kas_transactions_student_id_fkey(full_name, nickname),
        recorder:profiles!kas_transactions_recorded_by_fkey(full_name, nickname)
      `)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);

    if (txErr) {
      return NextResponse.json({ error: "Gagal memuat transaksi: " + txErr.message }, { status: 500 });
    }

    // Semua mahasiswa (untuk checklist pembayaran)
    const { data: students, error: studErr } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, nim, position")
      .eq("is_active", true)
      .order("full_name");

    if (studErr) {
      return NextResponse.json({ error: "Gagal memuat daftar mahasiswa." }, { status: 500 });
    }

    // Semua periode
    const { data: periods, error: periodErr } = await supabase
      .from("kas_periods")
      .select("*")
      .order("due_date", { ascending: true });

    if (periodErr) {
      return NextResponse.json({ error: "Gagal memuat periode." }, { status: 500 });
    }

    // Saldo
    const { data: balance } = await supabase.from("kas_balance").select("*").single();

    // Iuran yang sudah masuk per student_id per category (tidak void)
    const { data: paidMap } = await supabase
      .from("kas_transactions")
      .select("student_id, category, id, amount, occurred_on")
      .eq("type", "masuk")
      .is("voided_at", null)
      .not("student_id", "is", null);

    return NextResponse.json({
      balance: balance || { balance: 0, total_in: 0, total_out: 0 },
      transactions: transactions || [],
      students: students || [],
      periods: periods || [],
      paidMap: paidMap || [],
    });
  } catch (err: any) {
    console.error("KAS bendahara error:", err);
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
