import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * POST /api/kas/record-payment
 * Mencatat pembayaran iuran kas mahasiswa oleh Bendahara (can_manage_kas).
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
        { error: "Akses ditolak: Hanya Bendahara yang berhak mencatat pembayaran kas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { student_ids, period_label, amount, occurred_on, notes } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu mahasiswa untuk dicatat pembayarannya." },
        { status: 400 }
      );
    }

    if (!period_label || !period_label.trim()) {
      return NextResponse.json(
        { error: "Periode iuran (kategori) wajib diisi." },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Nominal iuran harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    const txDate = occurred_on || new Date().toISOString().split("T")[0];

    // Ambil data nama mahasiswa terpilih untuk deskripsi jelas
    const { data: students, error: studErr } = await supabase
      .from("profiles")
      .select("id, full_name, nim")
      .in("id", student_ids);

    if (studErr || !students) {
      return NextResponse.json({ error: "Gagal memverifikasi mahasiswa." }, { status: 500 });
    }

    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Buat batch records (append-only)
    const recordsToInsert = student_ids.map((sid: string) => {
      const st = studentMap.get(sid);
      const studentName = st ? st.full_name : "Mahasiswa";
      return {
        type: "masuk",
        amount: numAmount,
        student_id: sid,
        category: period_label.trim(),
        occurred_on: txDate,
        description: `Iuran ${period_label.trim()} - ${studentName}${notes ? ` (${notes})` : ""}`,
        recorded_by: user.id,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from("kas_transactions")
      .insert(recordsToInsert)
      .select();

    if (insertErr) {
      return NextResponse.json(
        { error: "Gagal menyimpan transaksi kas: " + insertErr.message },
        { status: 500 }
      );
    }

    // Catat activity log
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "RECORD_KAS_PAYMENT",
      target_table: "kas_transactions",
      target_id: period_label.trim(),
      details: {
        count: student_ids.length,
        student_ids,
        amount_each: numAmount,
        total: numAmount * student_ids.length,
        period: period_label.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mencatat pembayaran ${inserted.length} mahasiswa untuk ${period_label.trim()}.`,
      count: inserted.length,
    });
  } catch (err: any) {
    console.error("Record payment error:", err);
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
