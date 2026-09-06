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
