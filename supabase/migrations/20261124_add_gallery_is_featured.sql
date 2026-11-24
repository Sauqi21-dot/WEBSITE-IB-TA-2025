-- supabase/migrations/20261124_add_gallery_is_featured.sql
-- Tambah kolom is_featured pada tabel gallery_items jika belum ada

BEGIN;

ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

COMMIT;
