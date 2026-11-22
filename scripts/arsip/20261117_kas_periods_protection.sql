-- ==============================================================================
-- Migrasi: Proteksi Periode Kas & RLS Khusus Bendahara (can_manage_kas)
-- File: supabase/migrations/20261117_kas_periods_protection.sql
-- ==============================================================================

BEGIN;

-- 1. Index Unik: Mencegah duplikasi nama periode (case-insensitive & trim whitespace)
CREATE UNIQUE INDEX IF NOT EXISTS kas_periods_label_unique
ON public.kas_periods (lower(trim(label)));


-- 2. TRIGGER BEFORE DELETE: Menolak penghapusan jika periode memiliki transaksi apa pun
CREATE OR REPLACE FUNCTION public.check_kas_period_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Menolak jika ada transaksi apa pun dengan category = OLD.label (termasuk yang di-void)
    IF EXISTS (
        SELECT 1 FROM public.kas_transactions
        WHERE category = OLD.label
    ) THEN
        RAISE EXCEPTION 'Periode ini punya riwayat pembayaran sehingga tidak bisa dihapus.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_kas_period_delete ON public.kas_periods;
CREATE TRIGGER trg_check_kas_period_delete
    BEFORE DELETE ON public.kas_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.check_kas_period_delete();


-- 3. TRIGGER BEFORE UPDATE: Menolak perubahan label dan amount jika sudah ada transaksi (due_date tetap boleh)
CREATE OR REPLACE FUNCTION public.check_kas_period_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Jika label atau amount berubah, periksa apakah periode ini sudah punya transaksi
    IF (NEW.label IS DISTINCT FROM OLD.label) OR (NEW.amount IS DISTINCT FROM OLD.amount) THEN
        IF EXISTS (
            SELECT 1 FROM public.kas_transactions
            WHERE category = OLD.label
        ) THEN
            RAISE EXCEPTION 'Periode ini punya riwayat pembayaran sehingga label dan nominal tidak bisa diubah.';
        END IF;
    END IF;
    -- due_date tetap diizinkan berubah tanpa terblokir
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_kas_period_update ON public.kas_periods;
CREATE TRIGGER trg_check_kas_period_update
    BEFORE UPDATE ON public.kas_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.check_kas_period_update();


-- 4. PERBAIKAN RLS: Ganti policy kas_periods_manage dengan hak eksklusif can_manage_kas = true
-- Catatan: Hanya policy 'kas_periods_manage' yang diganti. Policy SELECT 'kas_periods_select_authenticated' tetap utuh.
DROP POLICY IF EXISTS "kas_periods_manage" ON public.kas_periods;

-- Policy INSERT: Hanya bendahara yang memiliki flag can_manage_kas = true (tanpa super_admin)
DROP POLICY IF EXISTS "kas_periods_insert_bendahara" ON public.kas_periods;
CREATE POLICY "kas_periods_insert_bendahara" ON public.kas_periods
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND can_manage_kas = true
        )
    );

-- Policy UPDATE: Hanya bendahara yang memiliki flag can_manage_kas = true (tanpa super_admin)
DROP POLICY IF EXISTS "kas_periods_update_bendahara" ON public.kas_periods;
CREATE POLICY "kas_periods_update_bendahara" ON public.kas_periods
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND can_manage_kas = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND can_manage_kas = true
        )
    );

-- Policy DELETE: Hanya bendahara yang memiliki flag can_manage_kas = true (tanpa super_admin)
DROP POLICY IF EXISTS "kas_periods_delete_bendahara" ON public.kas_periods;
CREATE POLICY "kas_periods_delete_bendahara" ON public.kas_periods
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND can_manage_kas = true
        )
    );

COMMIT;
