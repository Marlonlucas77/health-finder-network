-- FEEDBACK / FALE CONOSCO
-- Contact channel for questions, complaints, suggestions and compliments.
-- Anyone (logged in or not) can submit a message; only the platform team
-- (service_role, e.g. via the Supabase dashboard) can read submissions —
-- this is a one-way inbox, not a public board.
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL DEFAULT 'duvida'
    CHECK (category IN ('duvida', 'reclamacao', 'elogio', 'sugestao', 'outro')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.feedback TO anon;
GRANT INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit; authenticated users must tag the message with their own
-- id (or leave it null), anonymous visitors must leave it null.
CREATE POLICY "feedback_insert_any" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- No SELECT policy is defined on purpose: submissions are only readable via
-- service_role (Supabase dashboard / admin tooling), keeping messages
-- private between the sender and the platform team.
