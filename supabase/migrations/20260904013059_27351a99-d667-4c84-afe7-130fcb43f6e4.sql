DROP POLICY IF EXISTS "sa_select_auth" ON public.shift_applications;
DROP POLICY IF EXISTS "sa_select_involved" ON public.shift_applications;
CREATE POLICY "sa_select_involved" ON public.shift_applications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = doctor_id
    OR auth.uid() = (SELECT created_by FROM public.shifts s WHERE s.id = shift_id)
  );
CREATE OR REPLACE FUNCTION public.shift_application_counts()
RETURNS TABLE(shift_id uuid, applicant_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sa.shift_id, count(*) AS applicant_count
  FROM public.shift_applications sa
  GROUP BY sa.shift_id;
$$;
REVOKE ALL ON FUNCTION public.shift_application_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_application_counts() TO authenticated;