import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Ambil courses & schedules
    const { data: courses } = await supabase
      .from("courses")
      .select("*")
      .order("name", { ascending: true });

    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select(`
        id, course_id, semester, day, start_time, end_time, room, notes,
        changed_at, archived, created_at,
        course:courses(id, name, lecturer_name, semester)
      `)
      .order("semester", { ascending: true })
      .order("day", { ascending: true })
      .order("start_time", { ascending: true });

    if (schedErr) {
      return NextResponse.json({ error: schedErr.message }, { status: 500 });
    }

    return NextResponse.json({
      courses: courses || [],
      schedules: schedules || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { course_name, lecturer_name, semester, day, start_time, end_time, room, notes } = body;

    if (!course_name || !course_name.trim()) {
      return NextResponse.json({ error: "Nama mata kuliah wajib diisi." }, { status: 400 });
    }
    if (!lecturer_name || !lecturer_name.trim()) {
      return NextResponse.json({ error: "Nama dosen pengampu wajib diisi." }, { status: 400 });
    }
    if (!day || !start_time || !end_time || !room) {
      return NextResponse.json({ error: "Hari, jam mulai, jam selesai, dan ruangan wajib diisi." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const sem = parseInt(semester, 10) || 3;

    // 1. Cari atau buat course
    let { data: existingCourse } = await adminSupabase
      .from("courses")
      .select("id")
      .eq("name", course_name.trim())
      .eq("semester", sem)
      .single();

    let courseId = existingCourse?.id;

    if (!courseId) {
      const { data: newCourse, error: cErr } = await adminSupabase
        .from("courses")
        .insert({
          name: course_name.trim(),
          semester: sem,
          lecturer_name: lecturer_name.trim(),
        })
        .select()
        .single();

      if (cErr) {
        return NextResponse.json({ error: "Gagal membuat mata kuliah: " + cErr.message }, { status: 500 });
      }
      courseId = newCourse.id;
    }

    // 2. Insert schedule
    const { data: newSchedule, error: sErr } = await adminSupabase
      .from("schedules")
      .insert({
        course_id: courseId,
        semester: sem,
        day,
        start_time,
        end_time,
        room: room.trim(),
        notes: notes?.trim() || null,
        archived: false,
      })
      .select(`
        id, course_id, semester, day, start_time, end_time, room, notes,
        changed_at, archived, created_at,
        course:courses(id, name, lecturer_name, semester)
      `)
      .single();

    if (sErr) {
      return NextResponse.json({ error: "Gagal membuat jadwal: " + sErr.message }, { status: 500 });
    }

    // Log
    await adminSupabase.from("activity_logs").insert({
      user_id: user.id,
      action: "ADD_SCHEDULE",
      target_table: "schedules",
      target_id: newSchedule.id,
      details: {
        course: course_name.trim(),
        day,
        time: `${start_time} - ${end_time}`,
        room: room.trim(),
        by: caller.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Jadwal kuliah berhasil ditambahkan.",
      schedule: newSchedule,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { id, course_name, lecturer_name, semester, day, start_time, end_time, room, notes, archived } = body;

    if (!id) {
      return NextResponse.json({ error: "ID jadwal wajib diisi." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Ambil jadwal yang ada saat ini
    const { data: currentSched, error: fetchErr } = await adminSupabase
      .from("schedules")
      .select("id, course_id, semester")
      .eq("id", id)
      .single();

    if (fetchErr || !currentSched) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    }

    // Jika ada perubahan nama matkul atau dosen, update di tabel courses
    if (course_name || lecturer_name) {
      const sem = semester ? parseInt(semester, 10) : currentSched.semester;
      if (currentSched.course_id) {
        const courseUpdate: Record<string, any> = {};
        if (course_name) courseUpdate.name = course_name.trim();
        if (lecturer_name) courseUpdate.lecturer_name = lecturer_name.trim();
        if (semester) courseUpdate.semester = sem;

        await adminSupabase
          .from("courses")
          .update(courseUpdate)
          .eq("id", currentSched.course_id);
      }
    }

    const updatePayload: Record<string, any> = {
      changed_at: new Date().toISOString(),
    };
    if (semester !== undefined) updatePayload.semester = parseInt(semester, 10) || 3;
    if (day !== undefined) updatePayload.day = day;
    if (start_time !== undefined) updatePayload.start_time = start_time;
    if (end_time !== undefined) updatePayload.end_time = end_time;
    if (room !== undefined) updatePayload.room = room.trim();
    if (notes !== undefined) updatePayload.notes = notes.trim() || null;
    if (typeof archived === "boolean") updatePayload.archived = archived;

    const { data: updated, error } = await adminSupabase
      .from("schedules")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id, course_id, semester, day, start_time, end_time, room, notes,
        changed_at, archived, created_at,
        course:courses(id, name, lecturer_name, semester)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log aktivitas
    await adminSupabase.from("activity_logs").insert({
      user_id: user.id,
      action: "UPDATE_SCHEDULE",
      target_table: "schedules",
      target_id: id,
      details: {
        course: (updated as any).course?.name || (updated as any).course?.[0]?.name || course_name,
        day: updated.day,
        time: `${updated.start_time} - ${updated.end_time}`,
        room: updated.room,
        by: caller.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Jadwal kuliah berhasil diperbarui.",
      schedule: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
