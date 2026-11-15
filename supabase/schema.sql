-- ==============================================================================
-- SKEMA DATABASE WEBSITE KELAS IB 2025 (POLSRI)
-- Sesuai PRD Final v1.2 (Fase 3: Fondasi & Keamanan RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM / TYPES (atau CHECK constraints pada kolom)
-- role: 'student', 'admin', 'super_admin'
-- position: 'Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris', 'Bendahara', NULL

-- 3. TABEL: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nim VARCHAR(20) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    photo_path TEXT,
    photo_public BOOLEAN NOT NULL DEFAULT true,
    bio TEXT,
    social_link TEXT,
    position TEXT,
    birthday_day INTEGER CHECK (birthday_day >= 1 AND birthday_day <= 31),
    birthday_month INTEGER CHECK (birthday_month >= 1 AND birthday_month <= 12),
    birthday_public BOOLEAN NOT NULL DEFAULT true,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT false,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
    can_manage_kas BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL: COURSES (Mata Kuliah)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    semester INTEGER NOT NULL,
    lecturer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABEL: SCHEDULES (Jadwal Kuliah)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT NOT NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABEL: GALLERY_ITEMS (Galeri dan Riwayat)
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    caption TEXT,
    image_path TEXT NOT NULL,
    semester INTEGER NOT NULL,
    category TEXT NOT NULL,
    taken_on DATE NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABEL: CLASS_HISTORY (Lini Masa Perjalanan Kelas)
CREATE TABLE IF NOT EXISTS public.class_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester INTEGER NOT NULL UNIQUE,
    class_name TEXT NOT NULL, -- e.g. '1IB', '2IB', '3IB'
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABEL: KAS_PERIODS (Periode Iuran Kas)
CREATE TABLE IF NOT EXISTS public.kas_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. TABEL: KAS_TRANSACTIONS (Buku Kas Append-Only)
-- Catatan PRD: Tidak ada UPDATE/DELETE langsung. Koreksi hanya lewat void_kas_transaction.
CREATE TABLE IF NOT EXISTS public.kas_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    proof_path TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.profiles(id),
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TABEL: ACTIVITY_LOGS (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 11. VIEWS
-- ==============================================================================

-- AC-02: VIEW publik TIDAK BOLEH memuat kolom NIM, no HP, alamat, email
CREATE OR REPLACE VIEW public.public_students AS
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
    p.birthday_public
FROM public.profiles p;

-- VIEW untuk Saldo Kas (AC-11)
CREATE OR REPLACE VIEW public.kas_balance AS
SELECT
    COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE -amount END), 0) AS balance,
    COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) AS total_in,
    COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) AS total_out
FROM public.kas_transactions
WHERE voided_at IS NULL;

-- ==============================================================================
-- 12. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Fungsi helper untuk membaca data peran pengguna saat ini
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.profiles AS $$
    SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_manage_kas()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (can_manage_kas = true OR role = 'super_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger updated_at otomatis pada profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger untuk mencegah mahasiswa biasa mengubah kolom terproteksi di profiles
-- (role, can_manage_kas, nim, full_name, is_active hanya boleh diubah super_admin)
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.role() = 'authenticated' AND NOT public.is_super_admin() THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) OR
           (NEW.can_manage_kas IS DISTINCT FROM OLD.can_manage_kas) OR
           (NEW.nim IS DISTINCT FROM OLD.nim) OR
           (NEW.full_name IS DISTINCT FROM OLD.full_name) OR
           (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
            RAISE EXCEPTION 'Hanya Ketua (Super Admin) yang dapat mengubah data resmi, status aktif, dan peran akun.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();

-- ==============================================================================
-- 13. FUNGSI KHUSUS: VOID KAS (AC-12)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.void_kas_transaction(
    p_transaction_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_tx public.kas_transactions%ROWTYPE;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Autentikasi diperlukan.';
    END IF;

    IF NOT public.can_manage_kas() THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya bendahara atau ketua yang dapat membatalkan transaksi kas.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Alasan pembatalan (void) wajib diisi.';
    END IF;

    SELECT * INTO v_tx FROM public.kas_transactions WHERE id = p_transaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi kas tidak ditemukan.';
    END IF;

    IF v_tx.voided_at IS NOT NULL THEN
        RAISE EXCEPTION 'Transaksi ini sudah pernah dibatalkan sebelumnya.';
    END IF;

    -- Update void fields
    UPDATE public.kas_transactions
    SET
        voided_at = timezone('utc'::text, now()),
        voided_by = v_user_id,
        void_reason = trim(p_reason)
    WHERE id = p_transaction_id;

    -- Catat ke log aktivitas
    INSERT INTO public.activity_logs (user_id, action, target_table, target_id, details)
    VALUES (
        v_user_id,
        'VOID_KAS_TRANSACTION',
        'kas_transactions',
        p_transaction_id::text,
        jsonb_build_object(
            'amount', v_tx.amount,
            'type', v_tx.type,
            'reason', trim(p_reason)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS pada semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: PROFILES
-- ------------------------------------------------------------------------------
-- Mahasiswa login bisa melihat profil lengkap rekan kelas (untuk kebutuhan internal)
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- Pengunjung publik bisa melihat lewat view public_students (view security invoker/definer)
-- Untuk tabel profiles langsung, anon tidak diizinkan SELECT langsung
CREATE POLICY "profiles_select_anon" ON public.profiles
    FOR SELECT TO anon
    USING (false);

-- Mahasiswa bisa mengedit profil miliknya sendiri (AC-07)
CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Super Admin (Ketua) bisa mengedit semua profil (AC-14)
CREATE POLICY "profiles_update_super_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- RLS: COURSES & SCHEDULES (Jadwal)
-- ------------------------------------------------------------------------------
-- Publik dan mahasiswa dapat melihat jadwal yang tidak diarsip (AC-01)
CREATE POLICY "courses_select_all" ON public.courses
    FOR SELECT TO public
    USING (true);

CREATE POLICY "schedules_select_all" ON public.schedules
    FOR SELECT TO public
    USING (archived = false OR public.is_admin_or_super());

-- Hanya Admin & Super Admin yang bisa menambah, mengubah, mengarsipkan jadwal
CREATE POLICY "courses_admin_all" ON public.courses
    FOR ALL TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

CREATE POLICY "schedules_admin_all" ON public.schedules
    FOR ALL TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- ------------------------------------------------------------------------------
-- RLS: GALLERY_ITEMS
-- ------------------------------------------------------------------------------
-- Publik dan mahasiswa dapat melihat galeri yang tidak diarsip (AC-01)
CREATE POLICY "gallery_select_all" ON public.gallery_items
    FOR SELECT TO public
    USING (archived = false OR public.is_admin_or_super());

-- Hanya Admin & Super Admin yang bisa menambah & mengedit galeri (AC-08)
CREATE POLICY "gallery_admin_all" ON public.gallery_items
    FOR ALL TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- ------------------------------------------------------------------------------
-- RLS: CLASS_HISTORY
-- ------------------------------------------------------------------------------
CREATE POLICY "history_select_all" ON public.class_history
    FOR SELECT TO public
    USING (true);

CREATE POLICY "history_admin_all" ON public.class_history
    FOR ALL TO authenticated
    USING (public.is_admin_or_super())
    WITH CHECK (public.is_admin_or_super());

-- ------------------------------------------------------------------------------
-- RLS: KAS_PERIODS
-- ------------------------------------------------------------------------------
-- Mahasiswa login bisa melihat periode kas
CREATE POLICY "kas_periods_select_authenticated" ON public.kas_periods
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "kas_periods_manage" ON public.kas_periods
    FOR ALL TO authenticated
    USING (public.can_manage_kas())
    WITH CHECK (public.can_manage_kas());

-- ------------------------------------------------------------------------------
-- RLS: KAS_TRANSACTIONS (AC-12, AC-13)
-- ------------------------------------------------------------------------------
-- Anon TIDAK BISA melihat kas
CREATE POLICY "kas_transactions_anon_none" ON public.kas_transactions
    FOR SELECT TO anon
    USING (false);

-- Mahasiswa biasa hanya bisa melihat:
-- 1. Transaksi pengeluaran umum (student_id IS NULL)
-- 2. Transaksi pembayaran miliknya sendiri (student_id = auth.uid())
-- Pengurus (Bendahara, Admin, Ketua) bisa melihat semua (AC-13)
CREATE POLICY "kas_transactions_select_authenticated" ON public.kas_transactions
    FOR SELECT TO authenticated
    USING (
        public.can_manage_kas() OR
        public.is_admin_or_super() OR
        student_id IS NULL OR
        student_id = auth.uid()
    );

-- Bendahara dan Ketua dapat mencatat transaksi (INSERT)
CREATE POLICY "kas_transactions_insert" ON public.kas_transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.can_manage_kas());

-- TIDAK ADA POLICY UPDATE ATAU DELETE UNTUK KAS_TRANSACTIONS!
-- Pembatalan (void) hanya melalui fungsi `void_kas_transaction` (SECURITY DEFINER).

-- ------------------------------------------------------------------------------
-- RLS: ACTIVITY_LOGS (AC-15)
-- ------------------------------------------------------------------------------
-- Hanya Super Admin & Admin yang bisa melihat log aktivitas
CREATE POLICY "activity_logs_select" ON public.activity_logs
    FOR SELECT TO authenticated
    USING (public.is_admin_or_super());

-- Insert diperbolehkan untuk authenticated pengguna saat melakukan aksi
CREATE POLICY "activity_logs_insert" ON public.activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin_or_super());

-- ==============================================================================
-- 15. GRANT PERMISSIONS KE ROLES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.public_students TO anon, authenticated;
GRANT SELECT ON public.kas_balance TO authenticated;
