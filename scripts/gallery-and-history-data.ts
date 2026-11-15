export interface GalleryItemData {
  id: string;
  title: string;
  caption: string;
  image_path: string;
  semester: number;
  category: 'Akademik' | 'Kebersamaan' | 'Kegiatan Kampus' | 'Lomba & Proyek';
  taken_on: string;
}

export interface ClassHistoryData {
  id: string;
  semester: number;
  class_name: string;
  period: string;
  summary: string;
  highlights: string[];
}

export const INITIAL_CLASS_HISTORY: ClassHistoryData[] = [
  {
    id: "hist-1",
    semester: 1,
    class_name: "1IB",
    period: "Ganjil 2024 / 2025",
    summary: "Awal mula 24 mahasiswa dipertemukan di Gedung Manajemen Informatika Polsri. Melewati masa adaptasi perkuliahan politeknik, dasar logika pemrograman C/Pascal, serta pembentukan kepengurusan kelas pertama.",
    highlights: [
      "Pengenalan kehidupan kampus dan lab komputer Polsri",
      "Studi perdana algoritma pemrograman & logika komputer",
      "Kompak menyelenggarakan syukuran kebersamaan semester 1",
    ],
  },
  {
    id: "hist-2",
    semester: 2,
    class_name: "2IB",
    period: "Genap 2024 / 2025",
    summary: "Semester penguatan fundamental teknologi informasi. Menghadapi praktikum struktur data, basis data relasional, dan mulai berkolaborasi dalam tim pengerjaan aplikasi desktop serta web dasar.",
    highlights: [
      "Proyek akhir kelompok pertama rancang bangun sistem informasi",
      "Mulai lahirnya panggilan dan kekhasan internal kelas",
      "Kunjungan industri dan seminar teknologi kampus",
    ],
  },
  {
    id: "hist-3",
    semester: 3,
    class_name: "3IB",
    period: "Ganjil 2025 / 2026",
    summary: "Memasuki tingkat menengah perkuliahan. Terbentuklah wadah arsip digital 'IB 2025' dengan tagline kebanggaan 'IB JOSJIS'. Fokus mendalami pemrograman web lanjut, rekayasa perangkat lunak, dan pengelolaan kas yang transparan.",
    highlights: [
      "Peluncuran sistem web kelas IB 2025 dengan otentikasi NIM dan RLS",
      "Praktek rekayasa software terstruktur dan arsitektur basis data",
      "Solidaritas kepengurusan: M. Zidal (Ketua), Sauqi (Wakil), Alika (Sekretaris), Salsa (Bendahara)",
    ],
  },
];

export const INITIAL_GALLERY_ITEMS: GalleryItemData[] = [
  {
    id: "gal-01",
    title: "Sesi Pertama di Lab Komputer Polsri",
    caption: "Momen 24 mahasiswa 1IB pertama kali menempati Lab MI untuk praktikum algoritma dasar.",
    image_path: "/avatars/avatar-3.svg",
    semester: 1,
    category: "Akademik",
    taken_on: "2024-09-15",
  },
  {
    id: "gal-02",
    title: "Kebersamaan Sehabis Ujian Tengah Semester 1",
    caption: "Kumpul bersama di kantin teknik setelah menyelesaikan pekan ujian algoritma dan matematika diskrit.",
    image_path: "/avatars/avatar-14.svg",
    semester: 1,
    category: "Kebersamaan",
    taken_on: "2024-11-05",
  },
  {
    id: "gal-03",
    title: "Presentasi Tugas Besar Basis Data 2IB",
    caption: "Suasana diskusi dan demo rancangan ERD sistem manajemen inventaris di hadapan dosen pembimbing.",
    image_path: "/avatars/avatar-19.svg",
    semester: 2,
    category: "Akademik",
    taken_on: "2025-05-20",
  },
  {
    id: "gal-04",
    title: "Buka Puasa Bersama Kelas 2IB",
    caption: "Momen ramah tamah seluruh anggota kelas, mempererat kekompakan di luar jam kuliah kampus.",
    image_path: "/avatars/avatar-22.svg",
    semester: 2,
    category: "Kebersamaan",
    taken_on: "2025-03-28",
  },
  {
    id: "gal-05",
    title: "Diskusi Desain & Pengembangan Website IB 2025",
    caption: "Pertemuan pengurus kelas menyusun kebutuhan PRD, struktur jadwal, dan transparansi buku kas 3IB.",
    image_path: "/avatars/avatar-1.svg",
    semester: 3,
    category: "Lomba & Proyek",
    taken_on: "2025-09-10",
  },
  {
    id: "gal-06",
    title: "Praktikum Jaringan Komputer & Subnetting",
    caption: "Konfigurasi kabel UTP dan setting router di laboratorium jaringan lantai 2 gedung MI Polsri.",
    image_path: "/avatars/avatar-10.svg",
    semester: 3,
    category: "Akademik",
    taken_on: "2025-10-02",
  },
];
