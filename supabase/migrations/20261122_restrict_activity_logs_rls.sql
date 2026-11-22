-- Migrasi: Restriksi pembacaan activity_logs hanya untuk super_admin
-- Tanggal: 2026-11-22

-- Ganti policy SELECT pada activity_logs agar hanya Super Admin yang bisa membaca
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin());
