-- supabase/migrations/20261124_gallery_permissions_and_storage.sql
-- Izin Galeri: Hak Mahasiswa & Admin, Penegakan RLS Tabel & Storage, serta Trigger Integritas

BEGIN;

-- ==============================================================================
-- 1. RLS: TABEL PUBLIC.GALLERY_ITEMS
-- ==============================================================================

-- Hapus policy lama yang akan digantikan
DROP POLICY IF EXISTS "gallery_admin_all" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_select_all" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_insert_authenticated" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_update_authorized" ON public.gallery_items;
DROP POLICY IF EXISTS "gallery_delete_admin_only" ON public.gallery_items;

-- A. Policy SELECT:
-- Publik melihat foto non-arsip. Pemilik foto dan Admin bisa melihat foto non-arsip maupun arsipnya.
CREATE POLICY "gallery_select_all" ON public.gallery_items
    FOR SELECT TO public
    USING (
        archived = false 
        OR (auth.uid() IS NOT NULL AND uploaded_by = auth.uid()) 
        OR public.is_admin_or_super()
    );

-- B. Policy INSERT:
-- Semua akun login yang aktif boleh menambah foto (uploaded_by harus id diri sendiri atau admin)
CREATE POLICY "gallery_insert_authenticated" ON public.gallery_items
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND (uploaded_by = auth.uid() OR public.is_admin_or_super())
    );

-- C. Policy UPDATE:
-- Mahasiswa hanya untuk foto miliknya; Admin & Super Admin untuk semua foto
CREATE POLICY "gallery_update_authorized" ON public.gallery_items
    FOR UPDATE TO authenticated
    USING (
        uploaded_by = auth.uid() OR public.is_admin_or_super()
    )
    WITH CHECK (
        uploaded_by = auth.uid() OR public.is_admin_or_super()
    );

-- D. Policy DELETE:
-- Hapus permanen HANYA Admin dan Super Admin
CREATE POLICY "gallery_delete_admin_only" ON public.gallery_items
    FOR DELETE TO authenticated
    USING (
        public.is_admin_or_super()
    );


-- ==============================================================================
-- 2. TRIGGER: PROTEKSI INTEGRITAS (uploaded_by & is_featured)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_gallery_items_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika bukan admin atau super_admin, tegakkan proteksi ketat
    IF NOT public.is_admin_or_super() THEN
        IF TG_OP = 'INSERT' THEN
            -- uploaded_by otomatis diisi id pengguna dari sesi
            IF auth.uid() IS NOT NULL THEN
                NEW.uploaded_by := auth.uid();
            END IF;
            -- Tolak jika mahasiswa mencoba mengirim is_featured = true
            IF NEW.is_featured = true THEN
                RAISE EXCEPTION 'Mahasiswa tidak diizinkan mengatur foto pilihan beranda (is_featured).';
            END IF;
            NEW.is_featured := false;

        ELSIF TG_OP = 'UPDATE' THEN
            -- Tolak jika mahasiswa mencoba mengubah uploaded_by
            IF NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by THEN
                RAISE EXCEPTION 'Mahasiswa tidak diizinkan mengubah uploaded_by.';
            END IF;
            -- Tolak jika mahasiswa mencoba mengubah is_featured
            IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
                RAISE EXCEPTION 'Hanya admin yang dapat mengubah status foto pilihan beranda (is_featured).';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_gallery_items_integrity ON public.gallery_items;
CREATE TRIGGER trg_protect_gallery_items_integrity
    BEFORE INSERT OR UPDATE ON public.gallery_items
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_gallery_items_integrity();


-- ==============================================================================
-- 3. RLS: SUPABASE STORAGE (BUCKET 'gallery')
-- ==============================================================================

-- Bersihkan policy lama storage bucket gallery
DROP POLICY IF EXISTS "gallery_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_public_select" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "gallery_storage_admin_delete" ON storage.objects;

-- A. SELECT: Publik hanya membaca file
CREATE POLICY "gallery_storage_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'gallery');

-- B. INSERT: Akun login hanya boleh mengunggah ke folder bernama ID-nya sendiri; admin untuk semua folder
CREATE POLICY "gallery_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'gallery' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_or_super()
        )
    );

-- C. UPDATE: Hanya boleh mengubah file miliknya sendiri; admin untuk semua
CREATE POLICY "gallery_storage_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'gallery' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_or_super()
        )
    )
    WITH CHECK (
        bucket_id = 'gallery' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_or_super()
        )
    );

-- D. DELETE: Hanya boleh menghapus file miliknya sendiri; admin untuk semua
CREATE POLICY "gallery_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'gallery' AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_or_super()
        )
    );

COMMIT;
