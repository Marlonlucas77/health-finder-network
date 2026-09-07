-- ADMIN REVIEW: CRM verification requests
--
-- doctor_profiles only has an "update own" policy (admins can't UPDATE
-- another user's row directly). Rather than widen that policy — which would
-- let an admin edit ANY field of a doctor's profile, not just the
-- verification flag — this narrow SECURITY DEFINER function does exactly
-- one thing: mark a verification request reviewed, and only on approval,
-- flip doctor_profiles.crm_verified for that specific doctor. It re-checks
-- the caller is an admin itself, so it's safe to expose to `authenticated`.
CREATE OR REPLACE FUNCTION public.review_verification_request(
  _request_id uuid,
  _approve boolean,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente administradores podem revisar verificações.';
  END IF;

  UPDATE public.verification_requests
  SET status = CASE WHEN _approve THEN 'aprovado' ELSE 'recusado' END,
      reviewer_id = auth.uid(),
      reviewer_note = _note,
      reviewed_at = now()
  WHERE id = _request_id
  RETURNING doctor_id INTO v_doctor_id;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação de verificação não encontrada.';
  END IF;

  IF _approve THEN
    UPDATE public.doctor_profiles
    SET crm_verified = true
    WHERE user_id = v_doctor_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.review_verification_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_verification_request(uuid, boolean, text) TO authenticated;
