/**
 * CareLoop Alert Engine
 * Rules-based alert logic — all thresholds live here only.
 * 
 * Language rules (enforced strictly):
 * NEVER say: "heart failure exacerbation", "in danger", "diagnose", "treat with"
 * ALWAYS say: "contact doctor", "monitor closely", "seek urgent evaluation",
 *             "this may need medical attention"
 */

export type Severity = 'green' | 'yellow' | 'red';

export interface AlertResult {
  severity: Severity;
  messages: string[];
}

export interface DailyLogInput {
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
}

export interface PatientBaseline {
  baseline_weight_lbs: number | null;
  baseline_sys_bp: number | null;
  baseline_dia_bp: number | null;
  baseline_pulse: number | null;
  baseline_spo2: number | null;
}

export interface HistoricalData {
  yesterdayWeight: number | null;
  sevenDayWeights: number[];  // oldest to newest
  previousDayPoorSleep: boolean;
}

export function evaluateAlerts(
  log: DailyLogInput,
  baseline: PatientBaseline,
  history: HistoricalData
): AlertResult {
  const redMessages: string[] = [];
  const yellowMessages: string[] = [];

  // === RED ALERTS (act now) ===

  // Weight gain >= 3 lb vs yesterday
  if (log.weight_lbs != null && history.yesterdayWeight != null) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 3) {
      redMessages.push(
        `Weight increased by ${gain.toFixed(1)} lbs since yesterday. Please seek urgent evaluation.`
      );
    }
  }

  // SpO2 < 90
  if (log.spo2 != null && log.spo2 < 90) {
    redMessages.push(
      `Oxygen level is ${log.spo2}%, which is below 90%. Please contact doctor immediately.`
    );
  }

  // Severe confusion
  if (log.severe_confusion) {
    redMessages.push(
      'Severe confusion reported. This may need urgent medical attention. Please contact doctor.'
    );
  }

  // Fall or near fall
  if (log.fall_or_near_fall) {
    redMessages.push(
      'A fall or near-fall was reported. Please contact doctor for evaluation.'
    );
  }

  // Breathing worse AND SpO2 < (baseline - 3)
  if (
    log.breathing_worse &&
    log.spo2 != null &&
    baseline.baseline_spo2 != null &&
    log.spo2 < baseline.baseline_spo2 - 3
  ) {
    redMessages.push(
      `Breathing is worse and oxygen is ${log.spo2}%, below baseline. Please seek urgent evaluation.`
    );
  }

  // Systolic BP < 90 or > 180
  if (log.systolic_bp != null) {
    if (log.systolic_bp < 90) {
      redMessages.push(
        `Blood pressure is low at ${log.systolic_bp} systolic. Please contact doctor immediately.`
      );
    }
    if (log.systolic_bp > 180) {
      redMessages.push(
        `Blood pressure is very high at ${log.systolic_bp} systolic. Please contact doctor immediately.`
      );
    }
  }

  // === YELLOW ALERTS (monitor closely) ===

  // Weight gain >= 2 lb vs yesterday (but not already red for >= 3)
  if (log.weight_lbs != null && history.yesterdayWeight != null) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 2 && gain < 3) {
      yellowMessages.push(
        `Weight increased by ${gain.toFixed(1)} lbs since yesterday. Monitor closely.`
      );
    }
  }

  // Weight gain >= 5 lb over 7 days
  if (log.weight_lbs != null && history.sevenDayWeights.length > 0) {
    const earliest = history.sevenDayWeights[0];
    if (earliest != null) {
      const gain7 = log.weight_lbs - earliest;
      if (gain7 >= 5) {
        yellowMessages.push(
          `Weight has increased by ${gain7.toFixed(1)} lbs over the past 7 days. Monitor closely.`
        );
      }
    }
  }

  // Mild confusion
  if (log.mild_confusion) {
    yellowMessages.push('Mild confusion reported. Monitor closely.');
  }

  // Stomach pain / bent over
  if (log.stomach_pain_bent_over) {
    yellowMessages.push('Stomach pain reported. Monitor closely and contact doctor if it persists.');
  }

  // Swelling
  if (log.swelling) {
    yellowMessages.push('Swelling reported. Monitor closely and contact doctor if it worsens.');
  }

  // Poor sleep for 2 consecutive days
  if (log.poor_sleep && history.previousDayPoorSleep) {
    yellowMessages.push('Poor sleep for 2 consecutive days. Monitor closely.');
  }

  // Lasix not taken
  if (!log.lasix_taken) {
    yellowMessages.push('Lasix was not taken today. Please ensure medication adherence.');
  }

  // All meds not taken
  if (!log.all_meds_taken) {
    yellowMessages.push('Not all medications were taken today. Please review medication schedule.');
  }

  // SpO2 between 90-93
  if (log.spo2 != null && log.spo2 >= 90 && log.spo2 <= 93) {
    yellowMessages.push(
      `Oxygen level is ${log.spo2}%, which is lower than ideal. Monitor closely.`
    );
  }

  // Pulse < 50 or > 110
  if (log.pulse_bpm != null) {
    if (log.pulse_bpm < 50) {
      yellowMessages.push(
        `Pulse is low at ${log.pulse_bpm} bpm. Monitor closely and contact doctor if symptoms appear.`
      );
    }
    if (log.pulse_bpm > 110) {
      yellowMessages.push(
        `Pulse is elevated at ${log.pulse_bpm} bpm. Monitor closely and contact doctor if symptoms appear.`
      );
    }
  }

  // === DETERMINE SEVERITY ===
  if (redMessages.length > 0) {
    return {
      severity: 'red',
      messages: [...redMessages, ...yellowMessages],
    };
  }

  if (yellowMessages.length > 0) {
    return {
      severity: 'yellow',
      messages: yellowMessages,
    };
  }

  return {
    severity: 'green',
    messages: ['All readings are within normal range. Keep up the great care!'],
  };
}

export function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'red': return 'Urgent — Contact Doctor';
    case 'yellow': return 'Monitor Closely';
    case 'green': return 'All Clear';
  }
}

export function getSeverityColor(severity: Severity) {
  switch (severity) {
    case 'red': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
    case 'yellow': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'green': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  }
}
