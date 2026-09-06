CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    career_name TEXT NOT NULL,
    description TEXT NOT NULL,
    soft_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    chaside_weights JSONB NOT NULL DEFAULT '{}'::JSONB,
    triadic_weights JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_profiles_chaside_weights_object
        CHECK (jsonb_typeof(chaside_weights) = 'object'),
    CONSTRAINT professional_profiles_triadic_weights_object
        CHECK (jsonb_typeof(triadic_weights) = 'object')
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.test_results'::REGCLASS
          AND conname = 'test_results_id_student_id_key'
    ) THEN
        ALTER TABLE public.test_results
            ADD CONSTRAINT test_results_id_student_id_key UNIQUE (id, student_id);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.student_professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    test_result_id UUID NOT NULL,
    professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    recommendation_rank SMALLINT NOT NULL CHECK (recommendation_rank > 0),
    match_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT student_professional_profiles_result_profile_unique
        UNIQUE (test_result_id, professional_profile_id),
    CONSTRAINT student_professional_profiles_match_details_object
        CHECK (jsonb_typeof(match_details) = 'object'),
    CONSTRAINT student_professional_profiles_result_student_fkey
        FOREIGN KEY (test_result_id, student_id)
        REFERENCES public.test_results (id, student_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_professional_profiles_student_id
    ON public.student_professional_profiles (student_id);

CREATE INDEX IF NOT EXISTS idx_student_professional_profiles_profile_id
    ON public.student_professional_profiles (professional_profile_id);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_professional_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_visible ON public.professional_profiles;
CREATE POLICY professional_profiles_visible ON public.professional_profiles
FOR SELECT
USING (is_active = TRUE OR public.get_auth_role() = 'admin_general');

DROP POLICY IF EXISTS student_professional_profiles_visible ON public.student_professional_profiles;
CREATE POLICY student_professional_profiles_visible ON public.student_professional_profiles
FOR SELECT
USING (
    public.get_auth_role() = 'admin_general'
    OR EXISTS (
        SELECT 1
        FROM public.students AS s
        WHERE s.id = student_professional_profiles.student_id
          AND (
              (public.get_auth_role() = 'distributor'
               AND s.distributor_id = public.get_auth_distributor_id())
              OR (public.get_auth_role() IN ('rector', 'teacher')
                  AND s.school_id = public.get_auth_school_id())
              OR (public.get_auth_role() = 'student'
                  AND s.user_id = auth.uid())
          )
    )
);