-- Direct messaging between médicos and escalistas.
-- Documents RLS for the pre-existing `messages` table and adds a
-- notification trigger so recipients see a bell notification on new messages.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_involved ON public.messages;
CREATE POLICY messages_select_involved
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

-- Only the recipient may update a message, and only to mark it read
-- (read_at). Enforced at the application layer by only ever patching
-- read_at; RLS here just restricts who can touch the row at all.
DROP POLICY IF EXISTS messages_update_recipient ON public.messages;
CREATE POLICY messages_update_recipient
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.recipient_id,
    'new_message',
    'Nova mensagem',
    COALESCE(sender_name, 'Alguém') || ' enviou uma mensagem para você.',
    '/mensagens?with=' || NEW.sender_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
