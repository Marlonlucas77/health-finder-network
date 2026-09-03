-- SECURITY FIX: shift_applications previously allowed ANY authenticated user
-- (any doctor or scheduler, related or not) to SELECT every row, exposing
-- which doctor applied to which shift to the whole platform.
--
-- This restricts direct table reads to the people actually involved
-- (the applicant doctor, or the scheduler who owns the shift), and adds a
-- SECURITY DEFINER function that returns only an aggregate count per shift
-- so the "3/5 candidaturas" badge on /vagas can still be shown publicly
-- without leaking identities.

DROP POLICY IF EXISTS "sa_select_auth" ON public.shift_applications;

CREATE POLICY "sa_select_involved" ON public.shift_applications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = doctor_id
    OR auth.uid() = (SELECT created_by FROM public.shifts s WHERE s.id = shift_id)
  );

CREATE OR REPLACE FUNCTION public.shift_application_counts()
RETURNS TABLE(shift_id uuid, applicant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT shift_id, count(*) AS applicant_count
  FROM public.shift_applications
  GROUP BY shift_id;
$$;

REVOKE ALL ON FUNCTION public.shift_application_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_application_counts() TO authenticated;