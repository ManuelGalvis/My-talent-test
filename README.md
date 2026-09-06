# MyTalent Test – Fase 1

This project contains the baseline multi-tenant Supabase schema, RLS isolation layer, storage bucket policies, compliance tracking, and a verification harness for the initial implementation of MyTalent Test.

## Structure

- `sql/01_extensions.sql` — required PostgreSQL extensions
- `sql/02_enums.sql` — business enum types
- `sql/03_identity_and_structure.sql` — distributor, school, teacher, student, and profile tables
- `sql/04_billing_and_financials.sql` — invoice and payment logic with automatic balance sync
- `sql/05_psychometric_and_audit.sql` — psychometric instruments, applications, responses, results, and audit log
- `sql/06_context_functions_and_rls.sql` — context functions and row-level security policies
- `sql/07_storage_and_compliance.sql` — storage buckets, RLS for objects, and consent/anonymization tracking
- `sql/08_professional_profiles.sql` — professional career catalog and student recommendation matches
- `sql/09_multitenant_rls_hardening.sql` — strict tenant isolation for students, responses, and test results
- `tests/phase1_test_harness.sql` — automated validation script for tenant isolation, lock enforcement, payment sync, result visibility, and habeas data traceability

## Execution order

Run the SQL files in the following order in a Supabase SQL editor or migration runner:

1. `sql/01_extensions.sql`
2. `sql/02_enums.sql`
3. `sql/03_identity_and_structure.sql`
4. `sql/04_billing_and_financials.sql`
5. `sql/05_psychometric_and_audit.sql`
6. `sql/06_context_functions_and_rls.sql`
7. `sql/07_storage_and_compliance.sql`
8. `sql/08_professional_profiles.sql`
9. `sql/09_multitenant_rls_hardening.sql`
10. `tests/phase1_test_harness.sql`

## Notes

- This implementation follows the tenant-isolation pattern described in the technical specification for a multi-tenant distributor model.
- The test harness uses local `SET LOCAL` and `set_config` statements to simulate different authenticated users and verify that tenant isolation works correctly.
- A live Supabase project or database must be available to execute the scripts against a real instance.
