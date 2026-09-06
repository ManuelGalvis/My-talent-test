-- Fase 5, Punto 1: endurecimiento RLS multi-tenant.
-- Este esquema usa students, student_test_responses y test_results.
-- resultados_chaside no existe en la versión actual de la base de datos.

ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_test_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_results ENABLE ROW LEVEL SECURITY;

-- Las políticas RLS son permisivas entre sí (OR). Se eliminan las políticas
-- amplias existentes antes de crear las reglas finales.
DROP POLICY IF EXISTS students_isolation ON public.students;
DROP POLICY IF EXISTS students_select_own_or_tenant ON public.students;
DROP POLICY IF EXISTS students_insert_own_or_tenant ON public.students;

CREATE POLICY students_select_own_or_tenant
ON public.students
FOR SELECT
TO authenticated
USING (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND user_id = auth.uid()
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
    OR (
        public.get_auth_role() IN ('rector', 'teacher')
        AND school_id = public.get_auth_school_id()
    )
);

CREATE POLICY students_insert_own_or_tenant
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND user_id = auth.uid()
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
    OR (
        public.get_auth_role() IN ('rector', 'teacher')
        AND school_id = public.get_auth_school_id()
    )
);

DROP POLICY IF EXISTS responses_student_save ON public.student_test_responses;
DROP POLICY IF EXISTS responses_student_select_own ON public.student_test_responses;
DROP POLICY IF EXISTS responses_student_insert_own ON public.student_test_responses;
DROP POLICY IF EXISTS responses_student_update_own ON public.student_test_responses;
DROP POLICY IF EXISTS responses_tenant_select ON public.student_test_responses;

CREATE POLICY responses_student_select_own
ON public.student_test_responses
FOR SELECT
TO authenticated
USING (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = student_test_responses.student_id
              AND s.user_id = auth.uid()
        )
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
    OR (
        public.get_auth_role() IN ('rector', 'teacher')
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = student_test_responses.student_id
              AND s.school_id = public.get_auth_school_id()
        )
    )
);

CREATE POLICY responses_student_insert_own
ON public.student_test_responses
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = student_test_responses.student_id
              AND s.user_id = auth.uid()
              AND s.distributor_id = student_test_responses.distributor_id
        )
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
);

CREATE POLICY responses_student_update_own
ON public.student_test_responses
FOR UPDATE
TO authenticated
USING (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND is_locked = FALSE
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = student_test_responses.student_id
              AND s.user_id = auth.uid()
        )
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
)
WITH CHECK (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND is_locked = FALSE
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = student_test_responses.student_id
              AND s.user_id = auth.uid()
              AND s.distributor_id = student_test_responses.distributor_id
        )
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
);

DROP POLICY IF EXISTS test_results_select ON public.test_results;
DROP POLICY IF EXISTS test_results_student_select_own ON public.test_results;
DROP POLICY IF EXISTS test_results_tenant_select ON public.test_results;

CREATE POLICY test_results_student_select_own
ON public.test_results
FOR SELECT
TO authenticated
USING (
    public.get_auth_role() = 'admin_general'
    OR (
        public.get_auth_role() = 'student'
        AND EXISTS (
            SELECT 1
            FROM public.students AS s
            WHERE s.id = test_results.student_id
              AND s.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1
            FROM public.test_applications AS ta
            WHERE ta.id = test_results.test_application_id
              AND ta.is_report_allowed = TRUE
        )
    )
    OR (
        public.get_auth_role() = 'distributor'
        AND distributor_id = public.get_auth_distributor_id()
    )
    OR (
        public.get_auth_role() IN ('rector', 'teacher')
        AND school_id = public.get_auth_school_id()
    )
);

-- Los resultados calculados deben ser escritos por el backend o service_role,
-- nunca por el estudiante. El estudiante solo puede insertar sus respuestas
-- en student_test_responses mediante la política anterior.

-- Verificación rápida opcional después de ejecutar la migración:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('students', 'student_test_responses', 'test_results');
