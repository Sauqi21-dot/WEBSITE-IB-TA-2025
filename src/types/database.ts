export type UserRole = 'student' | 'admin' | 'super_admin';

export interface Profile {
  id: string;
  nim: string;
  full_name: string;
  nickname: string | null;
  photo_path: string | null;
  photo_public: boolean;
  bio: string | null;
  social_link: string | null;
  position: string | null;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_public: boolean;
  must_change_password: boolean;
  is_active: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

// AC-02: Public student view NEVER contains NIM, phone, address, or email!
export interface PublicStudent {
  id: string;
  full_name: string;
  nickname: string | null;
  photo_path: string | null;
  photo_public: boolean;
  bio: string | null;
  social_link: string | null;
  position: string | null;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_public: boolean;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

export interface Course {
  id: string;
  name: string;
  semester: number;
  lecturer_name: string;
  created_at: string;
}

export interface Schedule {
  id: string;
  course_id: string;
  semester: number;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  start_time: string;
  end_time: string;
  room: string;
  notes: string | null;
  changed_at: string | null;
  archived: boolean;
  created_at: string;
  course?: Course;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  image_path: string;
  semester: number;
  category: string;
  taken_on: string;
  uploaded_by: string | null;
  is_featured: boolean;
  archived: boolean;
  created_at: string;
}

export interface ClassHistory {
  id: string;
  semester: number;
  class_name: string;
  summary: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}
