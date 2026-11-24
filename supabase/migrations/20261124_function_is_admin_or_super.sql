-- supabase/migrations/20261124_function_is_admin_or_super.sql
-- Definisi fungsi is_admin_or_super() untuk otorisasi RLS peran admin dan super_admin

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMIT;
