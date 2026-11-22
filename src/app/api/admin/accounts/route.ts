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

    const { data: caller } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    // Ambil seluruh 24 mahasiswa
    const { data: accounts, error } = await supabase
      .from("profiles")
      .select("id, nim, full_name, nickname, role, position, is_active, must_change_password, photo_path, photo_public, birthday_public, created_at, updated_at")
      .order("nim", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
