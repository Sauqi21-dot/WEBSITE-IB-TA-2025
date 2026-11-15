import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { STUDENTS_SEED_DATA } from "../../../../../scripts/students-data";
import { PublicStudent } from "@/types/database";

export async function GET() {
  try {
    let students: PublicStudent[] = [];

    // Coba ambil dari Supabase VIEW public_students (AC-02: VIEW ini tidak memiliki kolom NIM)
    try {
      const supabase = createClientServer();
      const { data, error } = await supabase
        .from("public_students")
        .select("id, full_name, nickname, photo_path, photo_public, bio, social_link, position, birthday_day, birthday_month, birthday_public")
        .order("full_name", { ascending: true });

      if (!error && data && data.length > 0) {
        students = data;
      }
    } catch {
      // Abaikan jika database belum tersambung
    }

    // Jika database belum tersambung atau kosong, gunakan fallback 24 mahasiswa
    // PENTING (AC-02): Sanitasi ketat, buang NIM secara total!
    if (students.length === 0) {
      students = STUDENTS_SEED_DATA.map((s) => ({
        id: `student-${s.no}`,
        full_name: s.full_name,
        nickname: s.nickname,
        photo_path: s.photo_path,
        photo_public: true,
        bio: s.bio,
        social_link: null,
        position: s.position,
        birthday_day: s.birthday_day,
        birthday_month: s.birthday_month,
        birthday_public: true,
      }));
    }

    // Pastikan tidak ada satupun field nim dalam respons
    const sanitizedStudents = students.map((s: any) => {
      const { nim: _nim, ...safeData } = s;
      return safeData;
    });

    return NextResponse.json({
      success: true,
      count: sanitizedStudents.length,
      data: sanitizedStudents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memuat data mahasiswa." },
      { status: 500 }
    );
  }
}
