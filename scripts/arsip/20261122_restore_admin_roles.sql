-- ==============================================================================
-- Migrasi: Kembalikan 4 Admin (Ketua, Wakil, Sekretaris, Bendahara)
-- Super admin adalah Ahmad Sauqi Efriansyah (NPM 062530801576)
-- File: supabase/migrations/20261122_restore_admin_roles.sql
-- ==============================================================================

BEGIN;

-- 1. Kembalikan 3 pengurus kelas menjadi role 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE nim IN (
  '062530801587', -- M. Zidal Muttaqin (Ketua)
  '062530801592', -- Putri Alika Sari (Sekretaris)
  '062530801595'  -- Salsabila Julia Mecca (Bendahara)
);

-- 2. Pastikan Ahmad Sauqi Efriansyah tetap satu-satunya super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE nim = '062530801576'; -- Ahmad Sauqi Efriansyah (Wakil Ketua)

-- 3. Verifikasi jumlah super_admin tepat 1 dan admin tepat 3
DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role = 'super_admin') <> 1 THEN
    RAISE EXCEPTION 'Jumlah super_admin tidak tepat 1. Dibatalkan.';
  END IF;
  IF (SELECT count(*) FROM public.profiles WHERE role = 'admin') <> 3 THEN
    RAISE EXCEPTION 'Jumlah admin tidak tepat 3. Dibatalkan.';
  END IF;
END $$;

COMMIT;
