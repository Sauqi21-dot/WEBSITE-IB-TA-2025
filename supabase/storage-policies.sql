-- Panduan Eksekusi Skema SQL di Supabase Dashboard
-- Jalankan file ini SEKALI di Supabase > SQL Editor > New Query

-- LANGKAH 1: Pastikan Supabase Auth digunakan (sudah default)
-- LANGKAH 2: Copy-paste isi supabase/schema.sql ke SQL Editor
-- LANGKAH 3: Klik "Run" / "Execute"
-- LANGKAH 4: Setelah schema berhasil, jalankan seed-accounts.ts untuk membuat 24 akun

-- CATATAN STORAGE (untuk foto profil & bukti transaksi kas):
-- Buat 2 storage bucket di Supabase Dashboard > Storage:
--   1. "avatars"       (public)  - foto profil mahasiswa
--   2. "kas-proofs"    (private) - bukti transaksi kas

-- RLS Policy untuk bucket "avatars" (jalankan di SQL Editor):
CREATE POLICY "Public avatars readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Auth users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy untuk bucket "kas-proofs" (hanya bendahara/super_admin):
CREATE POLICY "Kas managers can read proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kas-proofs' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND (can_manage_kas = true OR role IN ('admin', 'super_admin'))
    )
);

CREATE POLICY "Kas managers can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kas-proofs' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND (can_manage_kas = true OR role = 'super_admin')
    )
);
