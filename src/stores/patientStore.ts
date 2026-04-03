import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  lasix_taken: boolean | null;
  all_meds_taken: boolean | null;
  ambien_taken_last_night: boolean | null;
  med_note: string | null;
  general_note: string | null;
  created_at: string;
}

interface PatientState {
  patient: Patient | null;
  recentLogs: DailyLog[];
  todayLog: DailyLog | null;
  loading: boolean;
  fetchPatient: (userId: string) => Promise<void>;
  fetchRecentLogs: (patientId: string, days?: number) => Promise<void>;
  createPatient: (patient: Omit<Patient, 'id'>) => Promise<Patient>;
  saveDailyLog: (log: Partial<DailyLog> & { patient_id: string; log_date: string }) => Promise<DailyLog>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patient: null,
  recentLogs: [],
  todayLog: null,
  loading: false,

  fetchPatient: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('owner_user_id', userId)
      .single();

    if (data) {
      set({ patient: data as Patient });
      await get().fetchRecentLogs(data.id);
    }
    set({ loading: false });
  },

  fetchRecentLogs: async (patientId, days = 7) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('patient_id', patientId)
      .gte('log_date', sinceStr)
      .order('log_date', { ascending: false });

    const logs = (data ?? []) as DailyLog[];
    const today = new Date().toISOString().split('T')[0];
    const todayLog = logs.find((l) => l.log_date === today) ?? null;

    set({ recentLogs: logs, todayLog });
  },

  createPatient: async (patient) => {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();
    if (error) throw error;
    set({ patient: data as Patient });
    return data as Patient;
  },

  saveDailyLog: async (log) => {
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(log, { onConflict: 'patient_id,log_date' })
      .select()
      .single();
    if (error) throw error;

    const saved = data as DailyLog;
    const today = new Date().toISOString().split('T')[0];
    if (saved.log_date === today) {
      set({ todayLog: saved });
    }

    // Refresh recent logs
    await get().fetchRecentLogs(saved.patient_id);
    return saved;
  },
}));
