import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClientServer();
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: true, message: "Berhasil logout." },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal logout." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
