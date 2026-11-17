import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

/**
 * POST /api/kas/void
 * Membatalkan transaksi kas dengan alasan wajib (AC-12).
 * Append-only: Transaksi tidak dihapus, melainkan ditandai voided_at & void_reason via fungsi database void_kas_transaction.
 * Diperuntukkan bagi Bendahara (can_manage_kas) atau Super Admin.
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

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, can_manage_kas")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    }

    const canVoid = profile.can_manage_kas || profile.role === "super_admin";
    if (!canVoid) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Bendahara atau Ketua yang dapat membatalkan transaksi." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { transaction_id, reason } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: "ID transaksi wajib dicantumkan." }, { status: 400 });
    }

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Alasan pembatalan (void) wajib diisi dengan jelas (minimal 5 karakter)." },
        { status: 400 }
      );
    }

    // Panggil stored procedure void_kas_transaction
    const { error: rpcError } = await supabase.rpc("void_kas_transaction", {
      p_transaction_id: transaction_id,
      p_reason: reason.trim(),
    });

    if (rpcError) {
      return NextResponse.json(
        { error: `Gagal membatalkan transaksi: ${rpcError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaksi kas berhasil dibatalkan (void) sesuai standar audit trail.",
    });
  } catch (err: any) {
    console.error("Void transaction error:", err);
    return NextResponse.json({ error: err.message || "Kesalahan server." }, { status: 500 });
  }
}
