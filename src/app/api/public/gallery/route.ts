import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { INITIAL_GALLERY_ITEMS, INITIAL_CLASS_HISTORY } from "../../../../../scripts/gallery-and-history-data";

export async function GET() {
  try {
    let gallery: any[] = [];
    let history: any[] = [];

    try {
      const supabase = createClientServer();
      const { data: gData, error: gError } = await supabase
        .from("gallery_items")
        .select("*")
        .eq("archived", false)
        .order("taken_on", { ascending: false });

      if (!gError && gData && gData.length > 0) {
        gallery = gData;
      }

      const { data: hData, error: hError } = await supabase
        .from("class_history")
        .select("*")
        .order("semester", { ascending: true });

      if (!hError && hData && hData.length > 0) {
        history = hData;
      }
    } catch {
      // Abaikan jika database belum tersambung
    }

    if (gallery.length === 0) {
      gallery = INITIAL_GALLERY_ITEMS;
    }

    if (history.length === 0) {
      history = INITIAL_CLASS_HISTORY;
    }

    const featuredPhoto = gallery.find((g: any) => g.is_featured === true) || null;

    return NextResponse.json({
      success: true,
      gallery,
      history,
      featuredPhoto,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memuat galeri dan riwayat kelas." },
      { status: 500 }
    );
  }
}
