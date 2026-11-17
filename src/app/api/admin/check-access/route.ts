import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, nim, full_name, nickname, role, position, can_manage_kas, is_active")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    }

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";
    const isKetua = profile.role === "super_admin";
    const isBendahara = Boolean(profile.can_manage_kas);

    return NextResponse.json({
      hasAccess: isAdmin,
      isKetua,
      isBendahara,
      profile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
