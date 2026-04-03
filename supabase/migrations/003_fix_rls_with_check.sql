-- Fix RLS policies: add WITH CHECK to all FOR ALL policies
-- Without WITH CHECK, inserts/updates through ALL policies are blocked

DROP POLICY IF EXISTS "Owner can manage patients" ON public.patients;
CREATE POLICY "Owner can manage patients" ON public.patients
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Caregiver can manage daily logs" ON public.daily_logs;
CREATE POLICY "Caregiver can manage daily logs" ON public.daily_logs
  FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Caregiver can manage alerts" ON public.alerts;
CREATE POLICY "Caregiver can manage alerts" ON public.alerts
  FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Caregiver can manage family access" ON public.family_access;
CREATE POLICY "Caregiver can manage family access" ON public.family_access
  FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));

-- Allow authenticated users to look up other users by email (for family invite)
CREATE POLICY "Authenticated users can look up users by email"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');
