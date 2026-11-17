import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * POST /api/kas/record-expense
 * Mencatat pengeluaran kas kelas oleh Bendahara (can_manage_kas).
 * Transaksi append-only ke kas_transactions.
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

    // Periksa permission bendahara
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, can_manage_kas, full_name")
      .eq("id", user.id)
      .single();

    if (profErr || !profile || !profile.can_manage_kas) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Bendahara yang berhak mencatat pengeluaran kas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, category, description, occurred_on, proof_path } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Nominal pengeluaran harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: "Kategori pengeluaran wajib diisi (contoh: Konsumsi, Print Modul, Keperluan Kelas)." },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Keterangan/keperluan pengeluaran wajib diisi demi transparansi." },
        { status: 400 }
      );
    }

    const txDate = occurred_on || new Date().toISOString().split("T")[0];

    const { data: inserted, error: insertErr } = await supabase
      .from("kas_transactions")
      .insert({
        type: "keluar",
        amount: numAmount,
        student_id: null,
        category: category.trim(),
        description: description.trim(),
        occurred_on: txDate,
        proof_path: proof_path?.trim() || null,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: "Gagal menyimpan pengeluaran kas: " + insertErr.message },
        { status: 500 }
      );
    }

    // Catat activity log
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "RECORD_KAS_EXPENSE",
      target_table: "kas_transactions",
      target_id: inserted.id,
      details: {
        amount: numAmount,
        category: category.trim(),
        description: description.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengeluaran sebesar Rp ${numAmount.toLocaleString("id-ID")} berhasil dicatat.`,
      transaction: inserted,
    });
  } catch (err: any) {
    console.error("Record expense error:", err);
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
