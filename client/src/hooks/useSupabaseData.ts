import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import type { CheckInData, BaselineData } from '@/lib/alertEngine';

// ============ PATIENT ============

export interface Patient {
  id: string;
  owner_user_id: string;
  name: string;
  date_of_birth: string | null;
  baseline_weight_lbs: number | null;
  baseline_sys_bp: number | null;
  baseline_dia_bp: number | null;
  baseline_pulse: number | null;
  baseline_spo2: number | null;
  fluid_limit_oz: number | null;
  sodium_limit_mg: number | null;
  caregiver_name: string | null;
  family_contact_name: string | null;
  created_at: string;
}

export function usePatient() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatient = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);

    // Try by user_id first
    if (user?.id) {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data) { setPatient(data as Patient); setLoading(false); return; }
    }

    // Fallback: get first patient (for PIN-based auth)
    const { data: anyPatient } = await supabase
      .from('patients')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (anyPatient) setPatient(anyPatient as Patient);
    else setPatient(null);
    setLoading(false);
  }, [user, isAuthenticated]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  return { patient, loading, refetch: fetchPatient };
}

export function useSavePatient() {
  const { user } = useSupabaseAuth();

  const savePatient = useCallback(async (patientData: Partial<Patient> & { name: string }) => {
    const userId = user?.id || 'pin-user';

    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('owner_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('patients')
        .update(patientData)
        .eq('id', existing.id);
      return { error: error?.message || null };
    } else {
      const { error } = await supabase
        .from('patients')
        .insert({ ...patientData, owner_user_id: userId });
      return { error: error?.message || null };
    }
  }, [user]);

  return { savePatient };
}

// ============ DAILY LOGS ============

export interface DailyLog {
  id: string;
  patient_id: string;
  log_date: string;
  weight_lbs: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse_bpm: number | null;
  spo2: number | null;
  fluid_intake_oz: number | null;
  sodium_mg: number | null;
  breathing_worse: boolean;
  swelling: boolean;
  confusion: boolean;
  dizziness: boolean;
  chest_pain: boolean;
  missed_meds: boolean;
  fall_or_near_fall: boolean;
  poor_appetite: boolean;
  poor_sleep: boolean;
  notes: string | null;
  created_at: string;
}

export function useDailyLogs(patientId: string | undefined, days: number = 7) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('patient_id', patientId)
      .gte('log_date', startDate.toISOString().split('T')[0])
      .order('log_date', { ascending: true });

    setLogs((data || []) as DailyLog[]);
    setLoading(false);
  }, [patientId, days]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export function useSaveDailyLog() {
  const { user } = useSupabaseAuth();

  const saveDailyLog = useCallback(async (logData: Partial<DailyLog>) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('patient_id', logData.patient_id)
      .eq('log_date', today)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('daily_logs')
        .update({ ...logData, log_date: today })
        .eq('id', existing.id)
        .select()
        .single();
      return { data, error: error?.message || null };
    } else {
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({ ...logData, log_date: today })
        .select()
        .single();
      return { data, error: error?.message || null };
    }
  }, [user]);

  return { saveDailyLog };
}

// ============ ALERTS ============

export interface Alert {
  id: string;
  patient_id: string;
  severity: string;
  message: string;
  recommendations: string | null;
  created_at: string;
}

export function useAlerts(patientId: string | undefined, limit: number = 20) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    setAlerts((data || []) as Alert[]);
    setLoading(false);
  }, [patientId, limit]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
}

export function useSaveAlert() {
  const saveAlert = useCallback(async (
    patientId: string,
    severity: string,
    messages: string[],
    recommendations: string[]
  ) => {
    const { error } = await supabase
      .from('alerts')
      .insert({
        patient_id: patientId,
        severity,
        message: messages.join(' | '),
        recommendations: recommendations.join(' | '),
      });
    return { error: error?.message || null };
  }, []);

  return { saveAlert };
}

// ============ HELPERS ============

export function getBaselineData(patient: Patient): BaselineData {
  return {
    baseline_weight_lbs: patient.baseline_weight_lbs,
    baseline_sys_bp: patient.baseline_sys_bp,
    baseline_dia_bp: patient.baseline_dia_bp,
    baseline_pulse: patient.baseline_pulse,
    baseline_spo2: patient.baseline_spo2,
    fluid_limit_oz: patient.fluid_limit_oz,
    sodium_limit_mg: patient.sodium_limit_mg,
  };
}

export function logToCheckInData(log: DailyLog): CheckInData {
  return {
    weight_lbs: log.weight_lbs,
    systolic_bp: log.systolic_bp,
    diastolic_bp: log.diastolic_bp,
    pulse_bpm: log.pulse_bpm,
    spo2: log.spo2,
    fluid_intake_oz: log.fluid_intake_oz,
    sodium_mg: log.sodium_mg,
    breathing_worse: log.breathing_worse,
    swelling: log.swelling,
    confusion: log.confusion,
    dizziness: log.dizziness,
    chest_pain: log.chest_pain,
    missed_meds: log.missed_meds,
    fall_or_near_fall: log.fall_or_near_fall,
    poor_appetite: log.poor_appetite,
    poor_sleep: log.poor_sleep,
    notes: log.notes,
  };
}

// ============ FAMILY ACCESS ============

export function useFamilyAccess(patientId: string | undefined) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('family_access')
      .select('*')
      .eq('patient_id', patientId);
    setMembers(data || []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const inviteMember = useCallback(async (email: string) => {
    if (!patientId) return { error: 'No patient' };
    const { error } = await supabase
      .from('family_access')
      .insert({ patient_id: patientId, invited_email: email });
    if (!error) await fetchMembers();
    return { error: error?.message || null };
  }, [patientId, fetchMembers]);

  return { members, loading, inviteMember };
}

export function useFamilyReadAccess() {
  const { user } = useSupabaseAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    supabase
      .from('family_access')
      .select('patient_id')
      .eq('invited_email', user.email)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPatientId(data?.patient_id ?? null);
        setLoading(false);
      });
  }, [user]);

  return { patientId, loading, isFamilyMember: patientId != null };
}
