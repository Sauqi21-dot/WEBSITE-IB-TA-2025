import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { INITIAL_SCHEDULES, INITIAL_COURSES } from "../../../../../scripts/courses-and-schedules-data";

export async function GET() {
  try {
    let schedules: any[] = [];
    let lastUpdated: string | null = null;

    try {
      const supabase = createClientServer();
      const { data, error } = await supabase
        .from("schedules")
        .select(`
          id,
          semester,
          day,
          start_time,
          end_time,
          room,
          notes,
          changed_at,
          created_at,
          courses (
            id,
            name,
            lecturer_name
          )
        `)
        .eq("archived", false)
        .order("start_time", { ascending: true });

      if (!error && data && data.length > 0) {
        schedules = data.map((item: any) => ({
          id: item.id,
          semester: item.semester,
          day: item.day,
          start_time: item.start_time,
          end_time: item.end_time,
          room: item.room,
          notes: item.notes,
          changed_at: item.changed_at,
          course_name: item.courses?.name || "Mata Kuliah",
          lecturer_name: item.courses?.lecturer_name || "Dosen Pengampu",
        }));

        // Ambil timestamp asli dari changed_at atau created_at terbaru
        const latestTime = data.reduce((latest: string | null, curr: any) => {
          const itemTime = curr.changed_at || curr.created_at;
          if (!itemTime) return latest;
          return !latest || new Date(itemTime) > new Date(latest) ? itemTime : latest;
        }, null);
        if (latestTime) lastUpdated = latestTime;
      }
    } catch {
      // Abaikan jika database belum tersambung
    }

    if (schedules.length === 0) {
      schedules = INITIAL_SCHEDULES;
    }

    return NextResponse.json({
      success: true,
      lastUpdated,
      semester: 3,
      academicYear: "2026/2027",
      data: schedules,
      courses: INITIAL_COURSES,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memuat jadwal kuliah." },
      { status: 500 }
    );
  }
}
