export interface CourseData {
  id: string;
  name: string;
  semester: number;
  lecturer_name: string;
}

export interface ScheduleData {
  id: string;
  course_id: string;
  course_name: string;
  lecturer_name: string;
  semester: number;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  start_time: string;
  end_time: string;
  room: string;
  notes: string | null;
  changed_at: string | null;
}

export const INITIAL_COURSES: CourseData[] = [
  {
    id: "c-01",
    name: "Pemrograman Web Lanjut",
    semester: 3,
    lecturer_name: "Ade Silva, S.Kom., M.Kom.",
  },
  {
    id: "c-02",
    name: "Sistem Basis Data Terdistribusi",
    semester: 3,
    lecturer_name: "Rahmat Hidayat, M.Kom.",
  },
  {
    id: "c-03",
    name: "Rekayasa Perangkat Lunak",
    semester: 3,
    lecturer_name: "Dr. Sri Hartati, M.T.",
  },
  {
    id: "c-04",
    name: "Jaringan Komputer & Komunikasi Data",
    semester: 3,
    lecturer_name: "Ir. Bambang Triyono, M.T.",
  },
  {
    id: "c-05",
    name: "Desain Antarmuka Pengguna (UI/UX)",
    semester: 3,
    lecturer_name: "Yulia Anggraini, S.Kom., M.Cs.",
  },
  {
    id: "c-06",
    name: "Praktikum Pemrograman Berorientasi Objek",
    semester: 3,
    lecturer_name: "Dedy Irawan, M.Kom.",
  },
  {
    id: "c-07",
    name: "Bahasa Inggris Komputer & Presentasi",
    semester: 3,
    lecturer_name: "Nurul Aini, M.Pd.",
  },
];

export const INITIAL_SCHEDULES: ScheduleData[] = [
  {
    id: "sch-01",
    course_id: "c-01",
    course_name: "Pemrograman Web Lanjut",
    lecturer_name: "Ade Silva, S.Kom., M.Kom.",
    semester: 3,
    day: "Senin",
    start_time: "08:00",
    end_time: "10:30",
    room: "Lab Komputer MI-03",
    notes: "Bawa laptop pribadi, sudah terinstal Node.js dan VS Code.",
    changed_at: null,
  },
  {
    id: "sch-02",
    course_id: "c-02",
    course_name: "Sistem Basis Data Terdistribusi",
    lecturer_name: "Rahmat Hidayat, M.Kom.",
    semester: 3,
    day: "Senin",
    start_time: "10:45",
    end_time: "12:15",
    room: "Ruang Kuliah MI-202",
    notes: "Tugas resume Bab 3 diserahkan sebelum kelas mulai.",
    changed_at: null,
  },
  {
    id: "sch-03",
    course_id: "c-06",
    course_name: "Praktikum Pemrograman Berorientasi Objek",
    lecturer_name: "Dedy Irawan, M.Kom.",
    semester: 3,
    day: "Selasa",
    start_time: "08:00",
    end_time: "11:30",
    room: "Lab Komputer MI-01",
    notes: "Post-test praktikum pewarisan (inheritance).",
    changed_at: null,
  },
  {
    id: "sch-04",
    course_id: "c-07",
    course_name: "Bahasa Inggris Komputer & Presentasi",
    lecturer_name: "Nurul Aini, M.Pd.",
    semester: 3,
    day: "Selasa",
    start_time: "13:00",
    end_time: "14:40",
    room: "Ruang Kuliah MI-201",
    notes: "Presentasi kelompok pitch deck produk aplikasi.",
    changed_at: "2025-10-14T08:00:00Z",
  },
  {
    id: "sch-05",
    course_id: "c-03",
    course_name: "Rekayasa Perangkat Lunak",
    lecturer_name: "Dr. Sri Hartati, M.T.",
    semester: 3,
    day: "Rabu",
    start_time: "08:00",
    end_time: "10:30",
    room: "Ruang Kuliah MI-203",
    notes: "Pembahasan metodologi Agile & Scrum.",
    changed_at: null,
  },
  {
    id: "sch-06",
    course_id: "c-05",
    course_name: "Desain Antarmuka Pengguna (UI/UX)",
    lecturer_name: "Yulia Anggraini, S.Kom., M.Cs.",
    semester: 3,
    day: "Kamis",
    start_time: "08:00",
    end_time: "11:30",
    room: "Lab Multimedia MI-02",
    notes: "Review wireframe low-fidelity dan studi kasus desain editorial.",
    changed_at: null,
  },
  {
    id: "sch-07",
    course_id: "c-04",
    course_name: "Jaringan Komputer & Komunikasi Data",
    lecturer_name: "Ir. Bambang Triyono, M.T.",
    semester: 3,
    day: "Jumat",
    start_time: "08:00",
    end_time: "10:30",
    room: "Lab Jaringan MI-04",
    notes: "Simulasi routing statis dan konfigurasi subnetting.",
    changed_at: null,
  },
];
