-- DOCUMENT SCHEMA DRIFT: hospitals moderation columns + trigger
--
-- These changes already exist live in production (applied directly via the
-- Lovable editor, outside of any tracked migration). This migration exists
-- only to bring the migration history back in sync with reality, so a fresh
-- environment (or `supabase db reset`) ends up with the same schema. Every
-- statement is written to be a no-op if already applied, since it's meant to
-- be safely re-run against the current live database.

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Only admins may move a hospital in or out of 'aprovado'. Regular users
-- (via hospitals_insert_auth / hospitals_update_own) may only ever create or
-- edit their own hospital while it stays 'pendente'.
CREATE OR REPLACE FUNCTION public.protect_hospital_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente administradores podem aprovar ou recusar hospitais.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_hospital_status_trigger ON public.hospitals;
CREATE TRIGGER protect_hospital_status_trigger
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_hospital_status();

-- Public visibility now depends on moderation status, not just RLS existing.
DROP POLICY IF EXISTS "hospitals_select_all" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_select_visible" ON public.hospitals;
CREATE POLICY "hospitals_select_visible" ON public.hospitals
  FOR SELECT
  USING (
    status = 'aprovado'
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- New hospitals created through the app always start 'pendente', regardless
-- of what the client sends.
DROP POLICY IF EXISTS "hospitals_insert_auth" ON public.hospitals;
CREATE POLICY "hospitals_insert_auth" ON public.hospitals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND status = 'pendente');

-- Admins may update any hospital (used to approve/reject pending ones).
DROP POLICY IF EXISTS "hospitals_update_admin" ON public.hospitals;
CREATE POLICY "hospitals_update_admin" ON public.hospitals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON COLUMN public.hospitals.status IS
  'Moderation status: pendente | aprovado | recusado. Only admins can change it (see protect_hospital_status trigger).';
COMMENT ON COLUMN public.hospitals.verified IS
  'Reserved for a future "verified institution" badge, separate from moderation status.';
