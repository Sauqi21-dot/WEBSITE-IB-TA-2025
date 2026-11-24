-- supabase/migrations/20261122_add_social_urls.sql
-- Tambah kolom instagram_url, linkedin_url, website_url ke profiles
-- dan perbarui view public_students (hanya menambah kolom di akhir)

BEGIN;

-- 1. Tambah kolom baru ke tabel profiles (nullable, hanya jika belum ada)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linkedin_url   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS website_url    TEXT DEFAULT NULL;

-- 2. CHECK constraint: panjang maks 200 karakter
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_instagram_url_len,
  ADD CONSTRAINT profiles_instagram_url_len CHECK (char_length(instagram_url) <= 200);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_linkedin_url_len,
  ADD CONSTRAINT profiles_linkedin_url_len CHECK (char_length(linkedin_url) <= 200);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_website_url_len,
  ADD CONSTRAINT profiles_website_url_len CHECK (char_length(website_url) <= 200);

-- 3. Perbarui view public_students (hanya menambah kolom di akhir, pertahankan CASE WHEN dan tanpa filter)
CREATE OR REPLACE VIEW public.public_students
WITH (security_invoker = false)
AS
SELECT
    p.id,
    p.full_name,
    p.nickname,
    CASE 
        WHEN p.photo_public = true THEN p.photo_path 
        ELSE NULL 
    END AS photo_path,
    p.photo_public,
    p.bio,
    p.social_link,
    p.position,
    CASE 
        WHEN p.birthday_public = true THEN p.birthday_day 
        ELSE NULL 
    END AS birthday_day,
    CASE 
        WHEN p.birthday_public = true THEN p.birthday_month 
        ELSE NULL 
    END AS birthday_month,
    p.birthday_public,
    p.instagram_url,
    p.linkedin_url,
    p.website_url
FROM public.profiles p;

COMMIT;
