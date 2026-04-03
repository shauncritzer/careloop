-- CareLoop v1 Database Schema
-- Applied via Supabase MCP

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'family')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  baseline_weight_lbs NUMERIC(5,1),
  baseline_sys_bp INTEGER,
  baseline_dia_bp INTEGER,
  baseline_pulse INTEGER,
  baseline_spo2 INTEGER,
  caregiver_name TEXT,
  family_contact_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs NUMERIC(5,1),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  pulse_bpm INTEGER,
  spo2 INTEGER,
  breathing_worse BOOLEAN DEFAULT FALSE,
  mild_confusion BOOLEAN DEFAULT FALSE,
  severe_confusion BOOLEAN DEFAULT FALSE,
  stomach_pain_bent_over BOOLEAN DEFAULT FALSE,
  swelling BOOLEAN DEFAULT FALSE,
  poor_sleep BOOLEAN DEFAULT FALSE,
  weak_exhausted BOOLEAN DEFAULT FALSE,
  poor_appetite BOOLEAN DEFAULT FALSE,
  cough_worse BOOLEAN DEFAULT FALSE,
  fall_or_near_fall BOOLEAN DEFAULT FALSE,
  lasix_taken BOOLEAN,
  all_meds_taken BOOLEAN,
  ambien_taken_last_night BOOLEAN,
  med_note TEXT,
  general_note TEXT,
  created_by_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, log_date)
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('green', 'yellow', 'red')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.family_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, user_id)
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Owner can manage patients" ON public.patients FOR ALL USING (owner_user_id = auth.uid());
CREATE POLICY "Family can read patients they have access to" ON public.patients FOR SELECT
  USING (id IN (SELECT patient_id FROM public.family_access WHERE user_id = auth.uid()));

CREATE POLICY "Caregiver can manage daily logs" ON public.daily_logs FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));
CREATE POLICY "Family can read daily logs" ON public.daily_logs FOR SELECT
  USING (patient_id IN (SELECT patient_id FROM public.family_access WHERE user_id = auth.uid()));

CREATE POLICY "Caregiver can manage alerts" ON public.alerts FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));
CREATE POLICY "Family can read alerts" ON public.alerts FOR SELECT
  USING (patient_id IN (SELECT patient_id FROM public.family_access WHERE user_id = auth.uid()));

CREATE POLICY "Caregiver can manage family access" ON public.family_access FOR ALL
  USING (patient_id IN (SELECT id FROM public.patients WHERE owner_user_id = auth.uid()));
CREATE POLICY "Family can see own access" ON public.family_access FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX idx_daily_logs_patient_date ON public.daily_logs(patient_id, log_date DESC);
CREATE INDEX idx_alerts_patient ON public.alerts(patient_id, created_at DESC);
CREATE INDEX idx_family_access_user ON public.family_access(user_id);
