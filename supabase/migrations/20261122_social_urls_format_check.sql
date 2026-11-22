-- supabase/migrations/20261122_social_urls_format_check.sql
-- CHECK constraint format URL sosial pada tabel profiles (NULL tetap diizinkan)

BEGIN;

-- 1. Hapus constraint lama jika ada
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_instagram_url_format,
  DROP CONSTRAINT IF EXISTS profiles_linkedin_url_format,
  DROP CONSTRAINT IF EXISTS profiles_website_url_format;

-- 2. Tambah CHECK constraint dengan format regex
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_instagram_url_format
    CHECK (instagram_url IS NULL OR instagram_url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._]{1,30}/?$');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_linkedin_url_format
    CHECK (linkedin_url IS NULL OR linkedin_url ~ '^https://(www\.)?linkedin\.com/in/[A-Za-z0-9%_-]{3,100}/?$');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_website_url_format
    CHECK (website_url IS NULL OR website_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$');

COMMIT;
