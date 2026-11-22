-- ==============================================================================
-- Migrasi: Penyesuaian Role (Hanya student dan satu-satunya super_admin 062530801576)
-- File: supabase/migrations/20261119_roles_cleanup.sql
-- ==============================================================================

BEGIN;

-- Pastikan akun super_admin yang dituju memang ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE nim = '062530801576') THEN
    RAISE EXCEPTION 'NPM 062530801576 tidak ditemukan. Dibatalkan.';
  END IF;
END $$;

-- Turunkan hanya akun lain yang memang perlu diubah
UPDATE public.profiles
SET role = 'student', can_manage_kas = false
WHERE nim IS DISTINCT FROM '062530801576'
  AND (role IS DISTINCT FROM 'student' OR can_manage_kas IS DISTINCT FROM false);

-- Satu-satunya super_admin
UPDATE public.profiles
SET role = 'super_admin', can_manage_kas = false
WHERE nim = '062530801576';

-- Pastikan hasil akhirnya tepat satu super_admin
DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role = 'super_admin') <> 1 THEN
    RAISE EXCEPTION 'Jumlah super_admin tidak tepat 1. Dibatalkan.';
  END IF;
END $$;

COMMIT;
