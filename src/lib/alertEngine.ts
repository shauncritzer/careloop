/**
 * CareLoop Alert Engine
 * All alert thresholds live here — never hardcode elsewhere.
 *
 * Language rules:
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
  lasix_taken: boolean | null;
  all_meds_taken: boolean | null;
  ambien_taken_last_night: boolean | null;
}

export interface Baselines {
  baseline_weight_lbs: number | null;
  baseline_sys_bp: number | null;
  baseline_dia_bp: number | null;
  baseline_pulse: number | null;
  baseline_spo2: number | null;
}

export interface HistoryContext {
  yesterdayWeight: number | null;
  weightSevenDaysAgo: number | null;
  poorSleepYesterday: boolean;
}

export function evaluateAlerts(
  log: DailyLogInput,
  baselines: Baselines,
  history: HistoryContext
): AlertResult {
  const redMessages: string[] = [];
  const yellowMessages: string[] = [];

  // ========== RED ALERTS ==========

  // Weight gain >= 3 lb vs yesterday
  if (log.weight_lbs != null && history.yesterdayWeight != null) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 3) {
      redMessages.push(
        `Weight increased ${gain.toFixed(1)} lbs since yesterday. Please contact the doctor promptly.`
      );
    }
  }

  // SpO2 < 90
  if (log.spo2 != null && log.spo2 < 90) {
    redMessages.push(
      `Oxygen level is ${log.spo2}%. Seek urgent evaluation — this may need immediate medical attention.`
    );
  }

  // Severe confusion
  if (log.severe_confusion) {
    redMessages.push(
      'Severe confusion reported. Seek urgent evaluation — contact the doctor right away.'
    );
  }

  // Fall or near fall
  if (log.fall_or_near_fall) {
    redMessages.push(
      'A fall or near-fall was reported. Contact the doctor to discuss next steps.'
    );
  }

  // Breathing worse AND SpO2 < baseline - 3
  if (
    log.breathing_worse &&
    log.spo2 != null &&
    baselines.baseline_spo2 != null &&
    log.spo2 < baselines.baseline_spo2 - 3
  ) {
    redMessages.push(
      `Breathing is worse and oxygen is ${log.spo2}% (baseline ${baselines.baseline_spo2}%). Seek urgent evaluation.`
    );
  }

  // Systolic BP < 90 or > 180
  if (log.systolic_bp != null) {
    if (log.systolic_bp < 90) {
      redMessages.push(
        `Blood pressure is low (${log.systolic_bp}/${log.diastolic_bp ?? '?'}). Contact the doctor promptly.`
      );
    }
    if (log.systolic_bp > 180) {
      redMessages.push(
        `Blood pressure is very high (${log.systolic_bp}/${log.diastolic_bp ?? '?'}). Seek urgent evaluation.`
      );
    }
  }

  // ========== YELLOW ALERTS ==========

  // Weight gain >= 2 lb vs yesterday (but not already red)
  if (
    log.weight_lbs != null &&
    history.yesterdayWeight != null &&
    redMessages.length === 0
  ) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 2) {
      yellowMessages.push(
        `Weight up ${gain.toFixed(1)} lbs since yesterday. Monitor closely.`
      );
    }
  }

  // Weight gain >= 5 lb over 7 days
  if (log.weight_lbs != null && history.weightSevenDaysAgo != null) {
    const gain7 = log.weight_lbs - history.weightSevenDaysAgo;
    if (gain7 >= 5) {
      yellowMessages.push(
        `Weight up ${gain7.toFixed(1)} lbs over the past 7 days. Contact the doctor to discuss.`
      );
    }
  }

  // Mild confusion
  if (log.mild_confusion) {
    yellowMessages.push('Mild confusion reported. Monitor closely today.');
  }

  // Stomach pain / bent over
  if (log.stomach_pain_bent_over) {
    yellowMessages.push(
      'Stomach pain reported. Monitor closely — contact doctor if it worsens.'
    );
  }

  // Swelling
  if (log.swelling) {
    yellowMessages.push(
      'Swelling reported. Monitor closely and contact the doctor if it increases.'
    );
  }

  // Poor sleep 2 consecutive days
  if (log.poor_sleep && history.poorSleepYesterday) {
    yellowMessages.push(
      'Poor sleep for 2 days in a row. Let the doctor know at the next visit.'
    );
  }

  // Lasix not taken
  if (log.lasix_taken === false) {
    yellowMessages.push(
      'Lasix was not taken today. Contact the doctor if this was not intentional.'
    );
  }

  // All meds not taken
  if (log.all_meds_taken === false) {
    yellowMessages.push(
      'Not all medications were taken. Monitor closely and note which were missed.'
    );
  }

  // SpO2 90–93
  if (log.spo2 != null && log.spo2 >= 90 && log.spo2 <= 93) {
    yellowMessages.push(
      `Oxygen is ${log.spo2}%. This is on the lower side — monitor closely.`
    );
  }

  // Pulse < 50 or > 110
  if (log.pulse_bpm != null) {
    if (log.pulse_bpm < 50) {
      yellowMessages.push(
        `Pulse is low at ${log.pulse_bpm} bpm. Monitor closely and contact the doctor if feeling faint.`
      );
    }
    if (log.pulse_bpm > 110) {
      yellowMessages.push(
        `Pulse is high at ${log.pulse_bpm} bpm. Monitor closely and contact the doctor if it continues.`
      );
    }
  }

  // ========== DETERMINE SEVERITY ==========
  if (redMessages.length > 0) {
    return { severity: 'red', messages: redMessages };
  }
  if (yellowMessages.length > 0) {
    return { severity: 'yellow', messages: yellowMessages };
  }
  return {
    severity: 'green',
    messages: ['All readings look good today. Keep up the great care!'],
  };
}
