-- =========================================================
-- MyTalent Test – Fase 1
-- =========================================================
-- Master migration for the initial multi-tenant Supabase setup.
-- Run this file in a Supabase SQL editor or migrate it via your preferred runner.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM (
  'admin_general',
  'distributor',
  'rector',
  'teacher',
  'student'
);

CREATE TYPE doc_type AS ENUM ('CC', 'TI', 'CE', 'PASAPORTE', 'PEP');
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'suspended', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE invoice_doc_type AS ENUM ('CUENTA_DE_COBRO', 'FACTURA_VENTA', 'RECIBO_PROVISIONAL');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE payment_method_type AS ENUM ('transferencia_bancaria', 'consignacion', 'efectivo', 'cheque', 'otro');
CREATE TYPE test_status AS ENUM ('assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE instrument_type AS ENUM ('CHASIDE', 'CEREBRO_TRIADICO');
CREATE TYPE program_level AS ENUM ('TECNICO', 'TECNOLOGICO', 'PROFESIONAL', 'DIPLOMADO', 'CURSO');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    distributor_id UUID,
    school_id UUID,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    document_type doc_type DEFAULT 'CC',
    document_number TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.distributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
    business_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    nit TEXT NOT NULL UNIQUE,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    city TEXT NOT NULL,
    department TEXT NOT NULL,
    is_educational_corporation BOOLEAN DEFAULT FALSE,
    status status_type DEFAULT 'active',
    license_duration_months INT CHECK (license_duration_months IN (3, 6, 12)),
    license_start_date DATE NOT NULL,
    license_end_date DATE NOT NULL,
    max_authorized_students INT DEFAULT 0,
    branding_config JSONB DEFAULT '{
      "logo_url": null,
      "slogan": null,
      "primary_color": "#1A56DB",
      "secondary_color": "#7E3AF2",
      "login_bg_url": null,
      "custom_subdomain": null,
      "pdf_footer_text": null,
      "contact_website": null
    }'::jsonb,
    ad_banner_config JSONB DEFAULT '{
      "enabled": false,
      "banner_url": null,
      "target_url": null,
      "start_date": null,
      "end_date": null,
      "target_roles": ["student", "teacher"]
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_license_dates CHECK (license_end_date >= license_start_date)
);

CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    rector_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    dane_code TEXT,
    nit TEXT,
    rector_name TEXT NOT NULL,
    rector_email TEXT NOT NULL,
    rector_phone TEXT,
    address TEXT,
    city TEXT NOT NULL,
    department TEXT NOT NULL,
    status status_type DEFAULT 'active',
    contracted_price_per_student NUMERIC(12, 2) DEFAULT 0.00,
    total_negotiated_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_status payment_status DEFAULT 'pending',
    balance_due NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    document_type doc_type DEFAULT 'CC',
    document_number TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    is_authorized BOOLEAN DEFAULT TRUE,
    status status_type DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    document_type doc_type NOT NULL,
    document_number TEXT NOT NULL,
    birth_date DATE NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    grade TEXT NOT NULL,
    group_name TEXT NOT NULL,
    academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    guardian_name TEXT,
    guardian_relationship TEXT,
    guardian_email TEXT,
    guardian_phone TEXT,
    habeas_data_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    habeas_data_accepted_at TIMESTAMPTZ,
    habeas_data_ip_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_document_per_school UNIQUE (school_id, document_type, document_number)
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    doc_type invoice_doc_type NOT NULL DEFAULT 'CUENTA_DE_COBRO',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    students_count INT NOT NULL CHECK (students_count > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    total_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - total_paid) STORED,
    status invoice_status DEFAULT 'issued',
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_invoice_per_distributor UNIQUE (distributor_id, invoice_number)
);

CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_type NOT NULL,
    bank_reference TEXT,
    voucher_url TEXT,
    notes TEXT,
    registered_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_receipt_per_distributor UNIQUE (distributor_id, receipt_number)
);

CREATE OR REPLACE FUNCTION public.fn_sync_invoice_and_school_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET total_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payment_transactions
      WHERE invoice_id = NEW.invoice_id
    ),
    status = CASE
      WHEN (
        total_amount - (
          SELECT COALESCE(SUM(amount), 0)
          FROM public.payment_transactions
          WHERE invoice_id = NEW.invoice_id
        )
      ) <= 0 THEN 'paid'::invoice_status
      ELSE 'partially_paid'::invoice_status
    END,
    updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;

  UPDATE public.schools
  SET balance_due = (
      SELECT COALESCE(SUM(balance), 0)
      FROM public.invoices
      WHERE school_id = NEW.school_id
        AND status != 'cancelled'
    ),
    payment_status = CASE
      WHEN (
        SELECT COALESCE(SUM(balance), 0)
        FROM public.invoices
        WHERE school_id = NEW.school_id
          AND status != 'cancelled'
      ) <= 0 THEN 'paid'::payment_status
      ELSE 'partial'::payment_status
    END,
    updated_at = NOW()
  WHERE id = NEW.school_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_payment_insert
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_invoice_and_school_balance();

CREATE TABLE public.evaluation_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code instrument_type NOT NULL UNIQUE,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    instructions TEXT NOT NULL,
    total_questions INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.test_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES public.evaluation_instruments(id),
    academic_year INT NOT NULL,
    grade TEXT NOT NULL,
    group_name TEXT NOT NULL,
    is_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    is_report_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    status test_status DEFAULT 'assigned',
    attempt_number INT DEFAULT 1,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_test_attempt UNIQUE (student_id, instrument_id, attempt_number)
);

CREATE TABLE public.student_test_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_application_id UUID NOT NULL UNIQUE REFERENCES public.test_applications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_question_index INT DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE TABLE public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_application_id UUID NOT NULL UNIQUE REFERENCES public.test_applications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    dimension_scores JSONB NOT NULL,
    primary_profile TEXT NOT NULL,
    secondary_profile TEXT,
    profile_interpretation TEXT NOT NULL,
    vocational_recommendations JSONB NOT NULL,
    distributor_prioritized_offer JSONB DEFAULT '[]'::jsonb,
    pdf_report_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.distributor_academic_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    program_level program_level NOT NULL,
    associated_vocational_fields TEXT[] NOT NULL,
    description TEXT,
    brochure_url TEXT,
    contact_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    distributor_id UUID,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_auth_distributor_id()
RETURNS UUID
STABLE
SECURITY DEFINER
AS $$
  SELECT distributor_id
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS UUID
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid();
$$ LANGUAGE sql;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_academic_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self" ON public.profiles
FOR SELECT
USING (id = auth.uid() OR public.get_auth_role() = 'admin_general');

CREATE POLICY "distributors_isolation" ON public.distributors
FOR ALL
USING (public.get_auth_role() = 'admin_general' OR id = public.get_auth_distributor_id());

CREATE POLICY "schools_isolation" ON public.schools
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR id = public.get_auth_school_id()
);

CREATE POLICY "teachers_isolation" ON public.teachers
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR (public.get_auth_role() IN ('rector', 'teacher') AND school_id = public.get_auth_school_id())
  OR user_id = auth.uid()
);

CREATE POLICY "students_isolation" ON public.students
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR (public.get_auth_role() IN ('rector', 'teacher') AND school_id = public.get_auth_school_id())
  OR user_id = auth.uid()
);

CREATE POLICY "invoices_isolation" ON public.invoices
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
);

CREATE POLICY "payment_transactions_isolation" ON public.payment_transactions
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
);

CREATE POLICY "responses_student_save" ON public.student_test_responses
FOR UPDATE
USING (student_id = auth.uid() AND is_locked = FALSE)
WITH CHECK (student_id = auth.uid() AND is_locked = FALSE);

CREATE POLICY "test_applications_isolation" ON public.test_applications
FOR ALL
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR (public.get_auth_role() IN ('rector', 'teacher') AND school_id = public.get_auth_school_id())
  OR (public.get_auth_role() = 'student' AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);

CREATE POLICY "test_results_select" ON public.test_results
FOR SELECT
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR (
    EXISTS (
      SELECT 1
      FROM public.test_applications ta
      WHERE ta.id = test_results.test_application_id
        AND ta.is_report_allowed = TRUE
    )
    AND (
      (public.get_auth_role() = 'student' AND student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
      OR (public.get_auth_role() IN ('rector', 'teacher') AND school_id = public.get_auth_school_id())
    )
  )
);

CREATE POLICY "offers_visible" ON public.distributor_academic_offers
FOR SELECT
USING (
  is_active = TRUE
  AND (
    public.get_auth_role() = 'admin_general'
    OR public.get_auth_role() = 'distributor'
    OR public.get_auth_role() IN ('rector', 'teacher', 'student')
  )
);

CREATE POLICY "audit_logs_company_only" ON public.audit_logs
FOR SELECT
USING (
  public.get_auth_role() = 'admin_general'
  OR (public.get_auth_role() = 'distributor' AND distributor_id = public.get_auth_distributor_id())
  OR (public.get_auth_role() IN ('rector', 'teacher') AND distributor_id = public.get_auth_distributor_id())
);

CREATE POLICY "evaluation_instruments_public" ON public.evaluation_instruments
FOR SELECT
USING (is_active = TRUE);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('reports', 'reports', false),
  ('branding', 'branding', true),
  ('vouchers', 'vouchers', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reports_download_rule" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'reports' AND (
    public.get_auth_role() = 'admin_general'
    OR (public.get_auth_role() = 'distributor' AND (storage.foldername(name))[1] = public.get_auth_distributor_id()::text)
    OR (public.get_auth_role() IN ('rector', 'teacher') AND (storage.foldername(name))[2] = public.get_auth_school_id()::text)
    OR (public.get_auth_role() = 'student' AND (storage.foldername(name))[3] = auth.uid()::text)
  )
);

CREATE POLICY "reports_upload_rule" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND (
    public.get_auth_role() = 'admin_general'
    OR public.get_auth_role() = 'distributor'
    OR public.get_auth_role() IN ('rector', 'teacher')
  )
);

CREATE TABLE public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    consent_text TEXT NOT NULL,
    ip_address TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.data_anonymization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
    request_status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE OR REPLACE FUNCTION public.fn_record_habeas_data_consent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.habeas_data_accepted = TRUE THEN
    INSERT INTO public.consent_records (
      user_id,
      distributor_id,
      document_type,
      consent_text,
      ip_address,
      accepted_at
    )
    VALUES (
      NEW.user_id,
      NEW.distributor_id,
      'Habeas Data - Ley 1581 / Decreto 1377',
      'Consentimiento informado para tratamiento de datos personales.',
      NEW.habeas_data_ip_address,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_student_insert_consent
AFTER INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.fn_record_habeas_data_consent();

CREATE OR REPLACE FUNCTION public.fn_anonymize_user_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.students
  SET
    first_name = 'ANONIMIZADO',
    last_name = 'ANONIMIZADO',
    document_number = 'ANONIMIZADO',
    guardian_name = NULL,
    guardian_email = NULL,
    guardian_phone = NULL,
    email = 'anonimo-' || p_user_id::text || '@deleted.local',
    phone = NULL,
    habeas_data_accepted = FALSE,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- Automated validation harness for Phase 1 acceptance criteria
-- =========================================================

DO $$
DECLARE
  v_has_profiles BOOLEAN;
  v_has_distributors BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO v_has_profiles;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'distributors'
  ) INTO v_has_distributors;

  IF NOT v_has_profiles OR NOT v_has_distributors THEN
    RAISE EXCEPTION 'Schema not initialized. Run the Fase 1 migration first.';
  END IF;
END $$;

-- 1. Tenant isolation check: a distributor must only read rows from its own tenant.
-- Example:
-- SELECT COUNT(*) = 0
-- FROM public.distributors d
-- WHERE d.id <> current_setting('request.jwt.claims', true)::jsonb->>'distributor_id';

-- 2. Lock enforcement check: a locked response must not be writable by the student.
-- Example:
-- UPDATE public.student_test_responses
-- SET responses = '{"answer": 42}'::jsonb
-- WHERE student_id = auth.uid() AND is_locked = TRUE;
-- This should be rejected by the policy.

-- 3. Payment trigger synchronization:
-- Example:
-- INSERT INTO public.payment_transactions (...)
-- VALUES (...);
-- Expect total_paid in invoices and balance_due in schools to update automatically.

-- 4. Result report visibility check:
-- Example:
-- SELECT * FROM public.test_results WHERE student_id = auth.uid() AND is_report_allowed = FALSE;
-- This should return zero rows for unauthorized students.

-- 5. Consent traceability check:
-- Example:
-- INSERT INTO public.students (..., habeas_data_accepted = TRUE, habeas_data_ip_address = '203.0.113.7')
-- VALUES (...);
-- Expect a matching row in public.consent_records.
