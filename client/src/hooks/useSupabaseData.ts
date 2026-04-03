import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import type { DailyLogInput, HistoricalData, PatientBaseline } from '@/lib/alertEngine';

// Types matching Supabase tables
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
  caregiver_name: string | null;
  family_contact_name: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  patient_id: string;
  log_date: string;
  weight_lbs: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse_bpm: number | null;
  spo2: number | null;
  breathing_worse: boolean;
  mild_confusion: boolean;
  severe_confusion: boolean;
  stomach_pain_bent_over: boolean;
  swelling: boolean;
  poor_sleep: boolean;
  weak_exhausted: boolean;
  poor_appetite: boolean;
  cough_worse: boolean;
  fall_or_near_fall: boolean;
  lasix_taken: boolean;
  all_meds_taken: boolean;
  ambien_taken_last_night: boolean;
  med_note: string | null;
  general_note: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  daily_log_id: string | null;
  severity: 'green' | 'yellow' | 'red';
  message: string;
  created_at: string;
}

// Hook: get patient for current user
export function usePatient() {
  const { user } = useSupabaseAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPatient = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('owner_user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (!error && data) setPatient(data);
    else setPatient(null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  return { patient, loading, refetch: fetchPatient };
}

// Hook: save or update patient
export function useSavePatient() {
  const { user } = useSupabaseAuth();

  const savePatient = useCallback(async (patientData: Partial<Patient>) => {
    if (!user) return { error: 'Not authenticated' };

    // Check if patient exists
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('owner_user_id', user.id)
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
        .insert({ ...patientData, owner_user_id: user.id });
      return { error: error?.message || null };
    }
  }, [user]);

  return { savePatient };
}

// Hook: daily logs for a patient
export function useDailyLogs(patientId: string | undefined, days: number = 7) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('patient_id', patientId)
      .gte('log_date', startDate.toISOString().split('T')[0])
      .order('log_date', { ascending: true });

    if (!error && data) setLogs(data);
    setLoading(false);
  }, [patientId, days]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

// Hook: save a daily log
export function useSaveDailyLog() {
  const { user } = useSupabaseAuth();

  const saveDailyLog = useCallback(async (logData: Partial<DailyLog>) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    const today = new Date().toISOString().split('T')[0];

    // Check if log exists for today
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
        .insert({
          ...logData,
          log_date: today,
          created_by_user_id: user.id,
        })
        .select()
        .single();
      return { data, error: error?.message || null };
    }
  }, [user]);

  return { saveDailyLog };
}

// Hook: save alerts
export function useSaveAlert() {
  const saveAlert = useCallback(async (alertData: {
    patient_id: string;
    daily_log_id: string;
    severity: string;
    message: string;
  }) => {
    const { error } = await supabase
      .from('alerts')
      .insert(alertData);
    return { error: error?.message || null };
  }, []);

  return { saveAlert };
}

// Hook: get alerts for a patient
export function useAlerts(patientId: string | undefined, limit: number = 20) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) setAlerts(data);
    setLoading(false);
  }, [patientId, limit]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
}

// Helper: get historical data for alert engine
export function getHistoricalData(logs: DailyLog[]): HistoricalData {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const yesterday = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  return {
    yesterdayWeight: yesterday?.weight_lbs ?? null,
    sevenDayWeights: sorted.map(l => l.weight_lbs).filter((w): w is number => w != null),
    previousDayPoorSleep: yesterday?.poor_sleep ?? false,
  };
}

// Helper: get patient baseline for alert engine
export function getPatientBaseline(patient: Patient): PatientBaseline {
  return {
    baseline_weight_lbs: patient.baseline_weight_lbs,
    baseline_sys_bp: patient.baseline_sys_bp,
    baseline_dia_bp: patient.baseline_dia_bp,
    baseline_pulse: patient.baseline_pulse,
    baseline_spo2: patient.baseline_spo2,
  };
}

// Hook: family access
export function useFamilyAccess(patientId: string | undefined) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('family_access')
      .select('*')
      .eq('patient_id', patientId);
    if (!error && data) setMembers(data);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const inviteMember = useCallback(async (email: string) => {
    if (!patientId) return { error: 'No patient' };
    // Look up user by email in users table
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (!userRow) return { error: 'No account found with that email. They need to sign up first.' };

    const { error } = await supabase
      .from('family_access')
      .insert({
        patient_id: patientId,
        user_id: userRow.id,
        granted_by: (await supabase.auth.getUser()).data.user?.id,
      });
    if (!error) await fetchMembers();
    return { error: error?.message || null };
  }, [patientId, fetchMembers]);

  return { members, loading, inviteMember, refetch: fetchMembers };
}

// Hook: check if current user has family read-only access
export function useFamilyReadAccess() {
  const { user } = useSupabaseAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('family_access')
      .select('patient_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPatientId(data?.patient_id ?? null);
        setLoading(false);
      });
  }, [user]);

  return { patientId, loading, isFamilyMember: patientId != null };
}
