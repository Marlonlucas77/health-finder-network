-- SHIFT APPLICATION NOTIFICATIONS
--
-- The `notifications` table already existed (with correct RLS: users can
-- only read/update/delete their own rows, and — deliberately — there is no
-- client-facing INSERT policy at all, so no authenticated user can forge a
-- notification into someone else's inbox). Notifications are created here
-- exclusively through SECURITY DEFINER trigger functions, which is the
-- correct way to populate a table like this: the trigger runs with the
-- table owner's privileges regardless of who fired it, but only ever does
-- the one specific, safe insert it's written for.

-- 1) Doctor applies to a shift -> notify the scheduler who posted it.
CREATE OR REPLACE FUNCTION public.notify_on_shift_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
  v_doctor_name text;
  v_hospital_name text;
  v_shift_date date;
BEGIN
  SELECT s.created_by, s.shift_date, h.name
    INTO v_created_by, v_shift_date, v_hospital_name
  FROM public.shifts s
  JOIN public.hospitals h ON h.id = s.hospital_id
  WHERE s.id = NEW.shift_id;

  SELECT p.full_name INTO v_doctor_name
  FROM public.profiles p WHERE p.id = NEW.doctor_id;

  IF v_created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_created_by,
      'shift_application',
      'Nova candidatura',
      coalesce(v_doctor_name, 'Um médico') || ' se candidatou à vaga em ' ||
        coalesce(v_hospital_name, 'seu hospital') || ' (' || to_char(v_shift_date, 'DD/MM/YYYY') || ').',
      '/vagas'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_shift_application_trigger ON public.shift_applications;
CREATE TRIGGER notify_on_shift_application_trigger
  AFTER INSERT ON public.shift_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_shift_application();

-- 2) Scheduler changes an application's status -> notify the doctor.
CREATE OR REPLACE FUNCTION public.notify_on_shift_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_name text;
  v_shift_date date;
  v_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT h.name, s.shift_date INTO v_hospital_name, v_shift_date
    FROM public.shifts s
    JOIN public.hospitals h ON h.id = s.hospital_id
    WHERE s.id = NEW.shift_id;

    v_title := CASE NEW.status
      WHEN 'aprovada' THEN 'Candidatura aprovada'
      WHEN 'recusada' THEN 'Candidatura recusada'
      ELSE 'Atualização na sua candidatura'
    END;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.doctor_id,
      'shift_application_status',
      v_title,
      'Sua candidatura à vaga em ' || coalesce(v_hospital_name, 'hospital') || ' (' ||
        to_char(v_shift_date, 'DD/MM/YYYY') || ') agora está: ' || NEW.status || '.',
      '/vagas'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_shift_application_status_trigger ON public.shift_applications;
CREATE TRIGGER notify_on_shift_application_status_trigger
  AFTER UPDATE ON public.shift_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_shift_application_status_change();
