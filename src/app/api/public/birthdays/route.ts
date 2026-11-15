import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase/server";
import { STUDENTS_SEED_DATA } from "../../../../../scripts/students-data";

// Helper untuk memeriksa tahun kabisat
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Mendapatkan tanggal sekarang di zona waktu WIB (Asia/Jakarta)
function getWibDate(): Date {
  const now = new Date();
  // Format ke timezone Asia/Jakarta
  const wibString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(wibString);
}

export async function GET() {
  try {
    let rawList: any[] = [];

    try {
      const supabase = createClientServer();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, photo_path, photo_public, birthday_day, birthday_month, birthday_public")
        .not("birthday_day", "is", null)
        .not("birthday_month", "is", null);

      if (!error && data && data.length > 0) {
        rawList = data;
      }
    } catch {
      // Abaikan jika database belum tersambung
    }

    if (rawList.length === 0) {
      rawList = STUDENTS_SEED_DATA.map((s) => ({
        id: `student-${s.no}`,
        full_name: s.full_name,
        nickname: s.nickname,
        photo_path: s.photo_path,
        photo_public: true,
        birthday_day: s.birthday_day,
        birthday_month: s.birthday_month,
        birthday_public: true,
      }));
    }

    // AC-10: Mahasiswa dengan birthday_public = false TIDAK BOLEH tampil sama sekali!
    const publicList = rawList.filter((item) => item.birthday_public !== false);

    const nowWib = getWibDate();
    const currentYear = nowWib.getFullYear();
    const currentMonth = nowWib.getMonth() + 1; // 1-12
    const currentDay = nowWib.getDate();
    const isCurrentYearLeap = isLeapYear(currentYear);

    // Normalisasi tanggal ultah untuk perbandingan tahun ini
    const processedList = publicList.map((item) => {
      let bDay = item.birthday_day;
      let bMonth = item.birthday_month;

      // Kasus 29 Februari pada tahun non-kabisat (FR-06: dirayakan 28 Februari)
      let effectiveDay = bDay;
      let effectiveMonth = bMonth;
      if (bMonth === 2 && bDay === 29 && !isCurrentYearLeap) {
        effectiveDay = 28;
      }

      // Hitung tanggal ulang tahun tahun ini
      let bDateThisYear = new Date(currentYear, effectiveMonth - 1, effectiveDay);
      // Jika sudah lewat tahun ini, gunakan tahun depan untuk perhitungan hari tersisa
      const todayDate = new Date(currentYear, currentMonth - 1, currentDay);
      const diffTime = bDateThisYear.getTime() - todayDate.getTime();
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Cek untuk tahun depan
        const nextYear = currentYear + 1;
        const isNextYearLeap = isLeapYear(nextYear);
        let nextEffectiveDay = bDay;
        if (bMonth === 2 && bDay === 29 && !isNextYearLeap) {
          nextEffectiveDay = 28;
        }
        const bDateNextYear = new Date(nextYear, bMonth - 1, nextEffectiveDay);
        diffDays = Math.ceil((bDateNextYear.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const isToday = effectiveMonth === currentMonth && effectiveDay === currentDay;
      const isNext7Days = diffDays > 0 && diffDays <= 7;

      return {
        id: item.id,
        full_name: item.full_name,
        nickname: item.nickname,
        photo_path: item.photo_public ? item.photo_path : null,
        birthday_day: item.birthday_day,
        birthday_month: item.birthday_month,
        effectiveDay,
        effectiveMonth,
        daysUntil: diffDays,
        isToday,
        isNext7Days,
      };
    });

    const todayBirthdays = processedList.filter((p) => p.isToday);
    const next7DaysBirthdays = processedList
      .filter((p) => p.isNext7Days)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Kelompokkan per bulan untuk kalender tahunan (Bulan 1 s.d. 12)
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    const calendar = monthNames.map((name, index) => {
      const monthNum = index + 1;
      const members = processedList
        .filter((p) => p.birthday_month === monthNum)
        .sort((a, b) => a.birthday_day - b.birthday_day);
      return {
        month: monthNum,
        monthName: name,
        count: members.length,
        members,
      };
    });

    return NextResponse.json({
      success: true,
      currentDateWib: {
        date: currentDay,
        month: currentMonth,
        year: currentYear,
        iso: nowWib.toISOString(),
      },
      today: todayBirthdays,
      next7Days: next7DaysBirthdays,
      calendar,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses kalender ulang tahun." },
      { status: 500 }
    );
  }
}
