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

    // Ambil log aktivitas beserta data profil pelaku
    const { data: logs, error } = await supabase
      .from("activity_logs")
      .select(`
        id, action, target_table, target_id, details, created_at, user_id,
        user:profiles!activity_logs_user_id_fkey(full_name, nickname, role, nim)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
