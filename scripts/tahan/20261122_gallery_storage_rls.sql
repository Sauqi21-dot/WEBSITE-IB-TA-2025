-- supabase/migrations/20261122_gallery_storage_rls.sql
-- Penegakan RLS pada Supabase Storage (bucket 'gallery')
-- Hanya menambah policy baru (tanpa DROP/DELETE/TRUNCATE data)

-- 1. Pastikan bucket 'gallery' ada dan publik
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy SELECT: Publik dan mahasiswa dapat melihat/mengunduh gambar galeri
DROP POLICY IF EXISTS "gallery_storage_public_select" ON storage.objects;
CREATE POLICY "gallery_storage_public_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'gallery');

-- 3. Policy INSERT: Hanya Admin & Super Admin yang berhak mengunggah gambar ke bucket galeri
DROP POLICY IF EXISTS "gallery_storage_admin_insert" ON storage.objects;
CREATE POLICY "gallery_storage_admin_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'gallery' AND public.is_admin_or_super()
    );

-- 4. Policy UPDATE: Hanya Admin & Super Admin yang berhak memperbarui gambar di bucket galeri
DROP POLICY IF EXISTS "gallery_storage_admin_update" ON storage.objects;
CREATE POLICY "gallery_storage_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'gallery' AND public.is_admin_or_super()
    )
    WITH CHECK (
        bucket_id = 'gallery' AND public.is_admin_or_super()
    );

-- 5. Policy DELETE: Hanya Admin & Super Admin yang berhak menghapus gambar di bucket galeri
DROP POLICY IF EXISTS "gallery_storage_admin_delete" ON storage.objects;
CREATE POLICY "gallery_storage_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'gallery' AND public.is_admin_or_super()
    );
