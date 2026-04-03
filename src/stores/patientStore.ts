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

export interface FamilyMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
}

interface PatientState {
  patient: Patient | null;
  recentLogs: DailyLog[];
  todayLog: DailyLog | null;
  isReadOnly: boolean; // true if user is family member, not caregiver
  familyMembers: FamilyMember[];
  loading: boolean;
  fetchPatient: (userId: string) => Promise<void>;
  fetchRecentLogs: (patientId: string, days?: number) => Promise<void>;
  createPatient: (patient: Omit<Patient, 'id'>) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  saveDailyLog: (log: Partial<DailyLog> & { patient_id: string; log_date: string }) => Promise<DailyLog>;
  inviteFamily: (email: string) => Promise<void>;
  removeFamily: (accessId: string) => Promise<void>;
  fetchFamilyMembers: (patientId: string) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patient: null,
  recentLogs: [],
  todayLog: null,
  isReadOnly: false,
  familyMembers: [],
  loading: false,

  fetchPatient: async (userId) => {
    // Only show loading if we don't already have a patient
    if (!get().patient) {
      set({ loading: true });
    }

    // First, try to find a patient owned by this user (caregiver)
    const { data: ownedPatient } = await supabase
      .from('patients')
      .select('*')
      .eq('owner_user_id', userId)
      .single();

    if (ownedPatient) {
      set({ patient: ownedPatient as Patient, isReadOnly: false });
      await get().fetchRecentLogs(ownedPatient.id);
      await get().fetchFamilyMembers(ownedPatient.id);
      set({ loading: false });
      return;
    }

    // Not a caregiver — check for family access
    const { data: familyAccess } = await supabase
      .from('family_access')
      .select('patient_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (familyAccess) {
      const { data: familyPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', familyAccess.patient_id)
        .single();

      if (familyPatient) {
        set({ patient: familyPatient as Patient, isReadOnly: true });
        await get().fetchRecentLogs(familyPatient.id);
        set({ loading: false });
        return;
      }
    }

    // No patient found at all
    set({ patient: null, isReadOnly: false, loading: false });
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
    set({ patient: data as Patient, isReadOnly: false });
    return data as Patient;
  },

  updatePatient: async (id, updates) => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set({ patient: data as Patient });
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

    await get().fetchRecentLogs(saved.patient_id);
    return saved;
  },

  fetchFamilyMembers: async (patientId) => {
    const { data } = await supabase
      .from('family_access')
      .select('id, user_id, users:user_id(email, full_name)')
      .eq('patient_id', patientId);

    if (data) {
      const members = data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.users?.email ?? '',
        full_name: row.users?.full_name ?? '',
      }));
      set({ familyMembers: members });
    }
  },

  inviteFamily: async (email: string) => {
    const patient = get().patient;
    if (!patient) throw new Error('No patient selected');

    // Look up the user by email
    const { data: targetUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (lookupError || !targetUser) {
      throw new Error('No account found with that email. They need to create an account first.');
    }

    // Check if access already exists
    const { data: existing } = await supabase
      .from('family_access')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('user_id', targetUser.id)
      .single();

    if (existing) {
      throw new Error('This person already has access.');
    }

    // Grant access
    const { error } = await supabase.from('family_access').insert({
      patient_id: patient.id,
      user_id: targetUser.id,
      granted_by: patient.owner_user_id,
    });
    if (error) throw error;

    // Update the user's role to 'family' if it's still 'caregiver'
    await supabase
      .from('users')
      .update({ role: 'family' })
      .eq('id', targetUser.id)
      .eq('role', 'caregiver');

    await get().fetchFamilyMembers(patient.id);
  },

  removeFamily: async (accessId) => {
    const patient = get().patient;
    if (!patient) return;

    await supabase.from('family_access').delete().eq('id', accessId);
    await get().fetchFamilyMembers(patient.id);
  },
}));
