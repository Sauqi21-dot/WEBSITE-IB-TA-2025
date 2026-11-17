import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * GET /api/kas/summary
 * Mengembalikan:
 * - balance, total_in, total_out dari kas_balance view
 * - status iuran milik user sendiri (per period)
 * - ringkasan "x dari 24 sudah bayar" (hanya count, bukan nama orang lain)
 * - daftar transaksi pengeluaran + iuran SENDIRI (100 terakhir)
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

    // 1. Saldo dari view
    const { data: balanceData, error: balErr } = await supabase
      .from("kas_balance")
      .select("*")
      .single();

    if (balErr) {
      return NextResponse.json({ error: "Gagal memuat saldo kas." }, { status: 500 });
    }

    // 2. Semua periode iuran
    const { data: periods, error: periodErr } = await supabase
      .from("kas_periods")
      .select("*")
      .order("due_date", { ascending: true });

    if (periodErr) {
      return NextResponse.json({ error: "Gagal memuat periode kas." }, { status: 500 });
    }

    // 3. Status iuran SENDIRI: hanya transaksi yang student_id = user.id dan type = masuk
    const { data: myPayments, error: myErr } = await supabase
      .from("kas_transactions")
      .select("id, amount, occurred_on, description, voided_at, category")
      .eq("student_id", user.id)
      .eq("type", "masuk")
      .is("voided_at", null)
      .order("occurred_on", { ascending: false });

    if (myErr) {
      return NextResponse.json({ error: "Gagal memuat status iuran." }, { status: 500 });
    }

    // 4. Ringkasan berapa orang sudah bayar per period (hanya count, bukan nama)
    // Ambil count dari iuran masuk yang tidak void per period label
    const { data: allPayments, error: allPayErr } = await supabase
      .from("kas_transactions")
      .select("category, student_id")
      .eq("type", "masuk")
      .is("voided_at", null)
      .not("student_id", "is", null);

    // Hitung per kategori (periode)
    const paymentSummary: Record<string, number> = {};
    if (allPayments) {
      for (const p of allPayments) {
        const key = p.category;
        if (!paymentSummary[key]) paymentSummary[key] = 0;
        paymentSummary[key]++;
      }
    }

    // 5. Transaksi pengeluaran + iuran sendiri (bisa dilihat mahasiswa biasa via RLS)
    const { data: transactions, error: txErr } = await supabase
      .from("kas_transactions")
      .select(`
        id, type, amount, category, occurred_on, description,
        voided_at, void_reason, created_at,
        student_id
      `)
      .or(`student_id.is.null,student_id.eq.${user.id}`)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (txErr) {
      return NextResponse.json({ error: "Gagal memuat transaksi." }, { status: 500 });
    }

    return NextResponse.json({
      balance: balanceData,
      periods: periods || [],
      myPayments: myPayments || [],
      paymentSummary,
      transactions: transactions || [],
    });
  } catch (err: any) {
    console.error("KAS summary error:", err);
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
