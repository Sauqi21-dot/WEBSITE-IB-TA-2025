-- ==============================================================================
-- Migrasi: Kolom period & fleksibilitas summary pada class_history
-- File: supabase/migrations/20261117_class_history_period.sql
-- ==============================================================================

BEGIN;

-- 1. Tambah kolom period pada class_history jika belum ada
ALTER TABLE public.class_history 
ADD COLUMN IF NOT EXISTS period TEXT;

-- 2. Ubah kolom summary agar boleh NULL (jika belum ada catatan)
ALTER TABLE public.class_history 
ALTER COLUMN summary DROP NOT NULL;

COMMIT;
