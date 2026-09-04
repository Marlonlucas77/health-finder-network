-- HARDEN user_roles SELECT policy
--
-- user_roles_select_auth previously used `USING (true)`, meaning any
-- authenticated user could read every row in the table — i.e. see exactly
-- who is an admin, a médico, or an escalista platform-wide. The app never
-- actually needs this (it only ever queries `.eq("user_id", userId)` for the
-- signed-in user), so this narrows it to: your own role rows, or all rows if
-- you're an admin. This does not change any INSERT/DELETE behavior, which
-- was already correctly restricted (see hospitals_admin_* / user_roles_*
-- policies from the base migration — regular users can only ever insert a
-- non-admin role for themselves; only admins can grant admin or delete
-- roles).
DROP POLICY IF EXISTS "user_roles_select_auth" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
