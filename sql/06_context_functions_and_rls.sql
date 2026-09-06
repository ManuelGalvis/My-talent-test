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
