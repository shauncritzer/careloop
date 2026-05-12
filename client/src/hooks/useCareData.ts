import { trpc } from '@/lib/trpc';
import type { CheckInData, BaselineData } from '@/lib/alertEngine';

// ============ Types (matching server schema) ============

export interface Patient {
  id: number;
  name: string;
  dateOfBirth: string | null;
  baselineWeightLbs: number | null;
  baselineSysBp: number | null;
  baselineDiaBp: number | null;
  baselinePulse: number | null;
  baselineSpo2: number | null;
  fluidLimitOz: number | null;
  sodiumLimitMg: number | null;
  caregiverName: string | null;
  familyContactName: string | null;
}

export interface DailyLog {
  id: number;
  patientId: number;
  logDate: string;
  weightLbs: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseBpm: number | null;
  spo2: number | null;
  fluidIntakeOz: number | null;
  sodiumMg: number | null;
  breathingWorse: boolean;
  swelling: boolean;
  confusion: boolean;
  dizziness: boolean;
  chestPain: boolean;
  missedMeds: boolean;
  fallOrNearFall: boolean;
  poorAppetite: boolean;
  poorSleep: boolean;
  notes: string | null;
}

export interface Alert {
  id: number;
  patientId: number;
  severity: string;
  message: string;
  recommendations: string | null;
  createdAt: Date;
}

// ============ PATIENT ============

export function usePatient() {
  const query = trpc.careloop.getPatient.useQuery(undefined, {
    retry: 2,
  });
  return {
    patient: query.data as Patient | null | undefined,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useSavePatient() {
  const mutation = trpc.careloop.savePatient.useMutation();
  
  const savePatient = async (data: {
    name: string;
    dateOfBirth?: string;
    baselineWeightLbs?: number;
    baselineSysBp?: number;
    baselineDiaBp?: number;
    baselinePulse?: number;
    baselineSpo2?: number;
    fluidLimitOz?: number;
    sodiumLimitMg?: number;
    caregiverName?: string;
    familyContactName?: string;
  }) => {
    try {
      await mutation.mutateAsync(data);
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Failed to save patient' };
    }
  };

  return { savePatient };
}

// ============ DAILY LOGS ============

export function useDailyLogs(patientId: number | undefined, days: number = 14) {
  const query = trpc.careloop.getDailyLogs.useQuery(
    { patientId: patientId!, days },
    { enabled: !!patientId, retry: 2 }
  );
  return {
    logs: (query.data || []) as DailyLog[],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useSaveDailyLog() {
  const mutation = trpc.careloop.saveDailyLog.useMutation();

  const saveDailyLog = async (data: {
    patientId: number;
    logDate?: string;
    weightLbs?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulseBpm?: number | null;
    spo2?: number | null;
    fluidIntakeOz?: number | null;
    sodiumMg?: number | null;
    breathingWorse?: boolean;
    swelling?: boolean;
    confusion?: boolean;
    dizziness?: boolean;
    chestPain?: boolean;
    missedMeds?: boolean;
    fallOrNearFall?: boolean;
    poorAppetite?: boolean;
    poorSleep?: boolean;
    notes?: string | null;
  }) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await mutation.mutateAsync({
        ...data,
        logDate: data.logDate || today,
        weightLbs: data.weightLbs ?? null,
        systolicBp: data.systolicBp ?? null,
        diastolicBp: data.diastolicBp ?? null,
        pulseBpm: data.pulseBpm ?? null,
        spo2: data.spo2 ?? null,
        fluidIntakeOz: data.fluidIntakeOz ?? null,
        sodiumMg: data.sodiumMg ?? null,
        breathingWorse: data.breathingWorse ?? false,
        swelling: data.swelling ?? false,
        confusion: data.confusion ?? false,
        dizziness: data.dizziness ?? false,
        chestPain: data.chestPain ?? false,
        missedMeds: data.missedMeds ?? false,
        fallOrNearFall: data.fallOrNearFall ?? false,
        poorAppetite: data.poorAppetite ?? false,
        poorSleep: data.poorSleep ?? false,
        notes: data.notes ?? null,
      });
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Failed to save daily log' };
    }
  };

  return { saveDailyLog };
}

// ============ ALERTS ============

export function useAlerts(patientId: number | undefined, limit: number = 20) {
  const query = trpc.careloop.getAlerts.useQuery(
    { patientId: patientId!, limit },
    { enabled: !!patientId, retry: 2 }
  );
  return {
    alerts: (query.data || []) as Alert[],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useSaveAlert() {
  const mutation = trpc.careloop.saveAlert.useMutation();

  const saveAlert = async (
    patientId: number,
    severity: string,
    messages: string[],
    recommendations: string[]
  ) => {
    try {
      await mutation.mutateAsync({
        patientId,
        severity: severity as 'green' | 'yellow' | 'red',
        messages,
        recommendations,
      });
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Failed to save alert' };
    }
  };

  return { saveAlert };
}

// ============ FAMILY ACCESS ============

export function useFamilyAccess(patientId: number | undefined) {
  const query = trpc.careloop.getFamilyMembers.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId, retry: 2 }
  );
  const inviteMutation = trpc.careloop.inviteFamilyMember.useMutation();

  const inviteMember = async (email: string) => {
    if (!patientId) return { error: 'No patient', accessCode: null };
    try {
      const result = await inviteMutation.mutateAsync({ patientId, email });
      query.refetch();
      return { error: null, accessCode: result.accessCode };
    } catch (e: any) {
      return { error: e.message || 'Failed to invite', accessCode: null };
    }
  };

  return {
    members: query.data || [],
    loading: query.isLoading,
    inviteMember,
  };
}

// ============ HELPERS ============

export function getBaselineData(patient: Patient): BaselineData {
  return {
    baseline_weight_lbs: patient.baselineWeightLbs,
    baseline_sys_bp: patient.baselineSysBp,
    baseline_dia_bp: patient.baselineDiaBp,
    baseline_pulse: patient.baselinePulse,
    baseline_spo2: patient.baselineSpo2,
    fluid_limit_oz: patient.fluidLimitOz,
    sodium_limit_mg: patient.sodiumLimitMg,
  };
}

export function logToCheckInData(log: DailyLog): CheckInData {
  return {
    weight_lbs: log.weightLbs,
    systolic_bp: log.systolicBp,
    diastolic_bp: log.diastolicBp,
    pulse_bpm: log.pulseBpm,
    spo2: log.spo2,
    fluid_intake_oz: log.fluidIntakeOz,
    sodium_mg: log.sodiumMg,
    breathing_worse: log.breathingWorse,
    swelling: log.swelling,
    confusion: log.confusion,
    dizziness: log.dizziness,
    chest_pain: log.chestPain,
    missed_meds: log.missedMeds,
    fall_or_near_fall: log.fallOrNearFall,
    poor_appetite: log.poorAppetite,
    poor_sleep: log.poorSleep,
    notes: log.notes,
  };
}
