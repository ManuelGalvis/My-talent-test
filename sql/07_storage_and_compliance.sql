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
