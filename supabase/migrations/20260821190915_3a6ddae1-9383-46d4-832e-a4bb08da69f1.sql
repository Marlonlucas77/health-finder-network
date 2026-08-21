-- ROLES
CREATE TYPE public.app_role AS ENUM ('medico','escalista','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  city text,
  state text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin');

-- SPECIALTIES
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialties TO anon;
GRANT SELECT ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialties_select_all" ON public.specialties FOR SELECT USING (true);

-- HOSPITALS
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  type text NOT NULL DEFAULT 'Hospital Geral',
  phone text,
  website text,
  address text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon;
GRANT SELECT, INSERT, UPDATE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospitals_select_all" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "hospitals_insert_auth" ON public.hospitals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "hospitals_update_own" ON public.hospitals FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- DOCTOR PROFILES
CREATE TABLE public.doctor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  crm text NOT NULL,
  crm_state text NOT NULL,
  years_experience int NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2),
  available boolean NOT NULL DEFAULT true,
  accepts_urgent boolean NOT NULL DEFAULT false,
  has_rqe boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.doctor_profiles TO authenticated;
GRANT ALL ON public.doctor_profiles TO service_role;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_profiles_select_auth" ON public.doctor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "doctor_profiles_insert_own" ON public.doctor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doctor_profiles_update_own" ON public.doctor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.doctor_specialties (
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, specialty_id)
);
GRANT SELECT, INSERT, DELETE ON public.doctor_specialties TO authenticated;
GRANT ALL ON public.doctor_specialties TO service_role;
ALTER TABLE public.doctor_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds_select_auth" ON public.doctor_specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "ds_insert_own" ON public.doctor_specialties FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "ds_delete_own" ON public.doctor_specialties FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

CREATE TABLE public.doctor_hospitals (
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, hospital_id)
);
GRANT SELECT, INSERT, DELETE ON public.doctor_hospitals TO authenticated;
GRANT ALL ON public.doctor_hospitals TO service_role;
ALTER TABLE public.doctor_hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dh_select_auth" ON public.doctor_hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "dh_insert_own" ON public.doctor_hospitals FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "dh_delete_own" ON public.doctor_hospitals FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- SCHEDULER PROFILES
CREATE TABLE public.scheduler_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization text NOT NULL,
  job_title text,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scheduler_profiles TO authenticated;
GRANT ALL ON public.scheduler_profiles TO service_role;
ALTER TABLE public.scheduler_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_select_auth" ON public.scheduler_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp_insert_own" ON public.scheduler_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update_own" ON public.scheduler_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  punctuality int CHECK (punctuality BETWEEN 1 AND 5),
  technical int CHECK (technical BETWEEN 1 AND 5),
  relationship int CHECK (relationship BETWEEN 1 AND 5),
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, reviewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_auth" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_insert_scheduler" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND doctor_id <> reviewer_id AND public.has_role(auth.uid(), 'escalista'));
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);

-- SHIFTS
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  specialty_id uuid REFERENCES public.specialties(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL DEFAULT '07:00',
  end_time time NOT NULL DEFAULT '19:00',
  payment numeric(10,2),
  slots int NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_select_auth" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert_scheduler" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'escalista'));
CREATE POLICY "shifts_update_own" ON public.shifts FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "shifts_delete_own" ON public.shifts FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.shift_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id, doctor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_applications TO authenticated;
GRANT ALL ON public.shift_applications TO service_role;
ALTER TABLE public.shift_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select_auth" ON public.shift_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "sa_insert_doctor" ON public.shift_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'medico'));
CREATE POLICY "sa_update_involved" ON public.shift_applications FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id OR auth.uid() = (SELECT created_by FROM public.shifts s WHERE s.id = shift_id))
  WITH CHECK (auth.uid() = doctor_id OR auth.uid() = (SELECT created_by FROM public.shifts s WHERE s.id = shift_id));
CREATE POLICY "sa_delete_own" ON public.shift_applications FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, city, state)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'city', NEW.raw_user_meta_data->>'state')
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'role','') IN ('medico','escalista') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_doctor_updated BEFORE UPDATE ON public.doctor_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_scheduler_updated BEFORE UPDATE ON public.scheduler_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED SPECIALTIES
INSERT INTO public.specialties (name, slug) VALUES
('Clínica Médica','clinica-medica'),('Pediatria','pediatria'),('Cardiologia','cardiologia'),
('Ortopedia e Traumatologia','ortopedia'),('Ginecologia e Obstetrícia','ginecologia-obstetricia'),
('Cirurgia Geral','cirurgia-geral'),('Anestesiologia','anestesiologia'),('Neurologia','neurologia'),
('Psiquiatria','psiquiatria'),('Dermatologia','dermatologia'),('Oftalmologia','oftalmologia'),
('Otorrinolaringologia','otorrinolaringologia'),('Urologia','urologia'),('Nefrologia','nefrologia'),
('Endocrinologia','endocrinologia'),('Gastroenterologia','gastroenterologia'),('Pneumologia','pneumologia'),
('Infectologia','infectologia'),('Oncologia Clínica','oncologia-clinica'),('Hematologia','hematologia'),
('Reumatologia','reumatologia'),('Geriatria','geriatria'),('Medicina Intensiva (UTI)','medicina-intensiva'),
('Medicina de Emergência','medicina-emergencia'),('Medicina de Família e Comunidade','medicina-familia'),
('Medicina do Trabalho','medicina-trabalho'),('Radiologia e Diagnóstico por Imagem','radiologia'),
('Patologia','patologia'),('Neurocirurgia','neurocirurgia'),('Cirurgia Vascular','cirurgia-vascular'),
('Cirurgia Plástica','cirurgia-plastica'),('Cirurgia Cardiovascular','cirurgia-cardiovascular'),
('Cirurgia Pediátrica','cirurgia-pediatrica'),('Coloproctologia','coloproctologia'),
('Mastologia','mastologia'),('Neonatologia','neonatologia'),('Angiologia','angiologia'),
('Alergia e Imunologia','alergia-imunologia'),('Acupuntura','acupuntura'),('Nutrologia','nutrologia');

CREATE INDEX idx_doctor_specialties_specialty ON public.doctor_specialties(specialty_id);
CREATE INDEX idx_reviews_doctor ON public.reviews(doctor_id);
CREATE INDEX idx_shifts_date ON public.shifts(shift_date);
