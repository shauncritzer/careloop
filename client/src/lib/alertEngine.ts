/**
 * CareLoop Alert Engine — CHF-focused
 * Evaluates daily check-in data and returns severity + messages + recommendations
 * RED = call doctor now, YELLOW = watch closely, GREEN = stable
 *
 * Language rules (enforced strictly):
 * NEVER say: "heart failure exacerbation", "in danger", "diagnose", "treat with"
 * ALWAYS say: "contact doctor", "monitor closely", "seek urgent evaluation"
 */

export type Severity = 'green' | 'yellow' | 'red';

export interface CheckInData {
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
}

export interface AlertResult {
  severity: Severity;
  messages: string[];
  recommendations: string[];
}

export interface BaselineData {
  baseline_weight_lbs: number | null;
  baseline_sys_bp: number | null;
  baseline_dia_bp: number | null;
  baseline_pulse: number | null;
  baseline_spo2: number | null;
  fluid_limit_oz: number | null;
  sodium_limit_mg: number | null;
}

export function evaluateCheckIn(
  data: CheckInData,
  baseline: BaselineData | null,
  previousLogs?: CheckInData[]
): AlertResult {
  const messages: string[] = [];
  const recommendations: string[] = [];
  let severity: Severity = 'green';

  const escalate = (level: Severity, msg: string, rec?: string) => {
    if (level === 'red') severity = 'red';
    else if (level === 'yellow' && severity !== 'red') severity = 'yellow';
    messages.push(msg);
    if (rec) recommendations.push(rec);
  };

  // === RED ALERTS (Call doctor immediately) ===

  if (data.chest_pain) {
    escalate('red', 'Chest pain reported', 'Contact doctor or call 911 immediately');
  }

  if (data.confusion) {
    escalate('red', 'Confusion or disorientation reported', 'This may indicate low cardiac output — contact the care team');
  }

  if (data.spo2 != null && data.spo2 < 90) {
    escalate('red', `Oxygen level critically low at ${data.spo2}%`, 'Seek immediate medical attention');
  }

  // Weight gain > 3 lbs in one day
  if (data.weight_lbs != null && previousLogs && previousLogs.length > 0) {
    const yesterday = previousLogs[previousLogs.length - 1];
    if (yesterday.weight_lbs != null) {
      const change = data.weight_lbs - yesterday.weight_lbs;
      if (change >= 3) {
        escalate('red', `Weight up ${change.toFixed(1)} lbs since yesterday — possible rapid fluid retention`, 'Call doctor today — this level of weight gain may indicate fluid buildup');
      }
    }
  }

  // Weight gain > 5 lbs in a week
  if (data.weight_lbs != null && previousLogs && previousLogs.length >= 5) {
    const weekAgo = previousLogs[0];
    if (weekAgo.weight_lbs != null) {
      const weekChange = data.weight_lbs - weekAgo.weight_lbs;
      if (weekChange >= 5) {
        escalate('red', `Weight up ${weekChange.toFixed(1)} lbs over the past week`, 'Call doctor — significant fluid retention over multiple days');
      }
    }
  }

  if (data.systolic_bp != null) {
    if (data.systolic_bp > 180) {
      escalate('red', `Blood pressure dangerously high at ${data.systolic_bp}/${data.diastolic_bp || '?'}`, 'Contact doctor immediately');
    } else if (data.systolic_bp < 80) {
      escalate('red', `Blood pressure dangerously low at ${data.systolic_bp}/${data.diastolic_bp || '?'}`, 'Contact doctor immediately — risk of fainting');
    }
  }

  if (data.fall_or_near_fall) {
    escalate('red', 'Fall or near-fall reported', 'Check for injuries and notify the care team');
  }

  // === YELLOW ALERTS (Watch closely) ===

  if (data.spo2 != null && data.spo2 >= 90 && data.spo2 <= 93) {
    escalate('yellow', `Oxygen level low at ${data.spo2}%`, 'Monitor closely — if it drops further, call the doctor');
  }

  // Weight gain 2-3 lbs in one day
  if (data.weight_lbs != null && previousLogs && previousLogs.length > 0) {
    const yesterday = previousLogs[previousLogs.length - 1];
    if (yesterday.weight_lbs != null) {
      const change = data.weight_lbs - yesterday.weight_lbs;
      if (change >= 2 && change < 3) {
        escalate('yellow', `Weight up ${change.toFixed(1)} lbs since yesterday`, 'Watch closely — if it continues rising, call the doctor');
      }
    }
  }

  if (data.breathing_worse) {
    escalate('yellow', 'Breathing difficulty reported', 'Monitor closely — elevate head while resting, call doctor if worsening');
  }

  if (data.swelling) {
    escalate('yellow', 'Swelling noticed (ankles, legs, or abdomen)', 'May indicate fluid retention — mention at next appointment');
  }

  if (data.dizziness) {
    escalate('yellow', 'Dizziness reported', 'Be careful with standing up — sit or lie down if dizzy');
  }

  if (data.missed_meds) {
    escalate('yellow', 'Medications were missed today', 'Try to take them as soon as possible — do not double up without asking the doctor');
  }

  // Fluid intake over limit
  if (data.fluid_intake_oz != null && baseline?.fluid_limit_oz != null) {
    if (data.fluid_intake_oz > baseline.fluid_limit_oz) {
      const over = data.fluid_intake_oz - baseline.fluid_limit_oz;
      escalate('yellow', `Fluid intake ${over} oz over the ${baseline.fluid_limit_oz} oz daily limit`, 'Try to reduce fluid intake for the rest of the day');
    }
  }

  // Sodium over limit
  if (data.sodium_mg != null && baseline?.sodium_limit_mg != null) {
    if (data.sodium_mg > baseline.sodium_limit_mg) {
      escalate('yellow', `Sodium intake estimated above the ${baseline.sodium_limit_mg}mg daily limit`, 'Be mindful of sodium in remaining meals today');
    }
  }

  if (data.systolic_bp != null && data.systolic_bp > 150 && data.systolic_bp <= 180) {
    escalate('yellow', `Blood pressure elevated at ${data.systolic_bp}/${data.diastolic_bp || '?'}`, 'Rest and recheck in 30 minutes');
  }

  if (data.systolic_bp != null && data.systolic_bp >= 80 && data.systolic_bp < 90) {
    escalate('yellow', `Blood pressure low at ${data.systolic_bp}/${data.diastolic_bp || '?'}`, 'Rest and stay hydrated — recheck soon');
  }

  if (data.pulse_bpm != null) {
    if (data.pulse_bpm < 50) {
      escalate('yellow', `Pulse is low at ${data.pulse_bpm} bpm`, 'Monitor closely and contact doctor if symptoms appear');
    }
    if (data.pulse_bpm > 110) {
      escalate('yellow', `Pulse is elevated at ${data.pulse_bpm} bpm`, 'Monitor closely and contact doctor if symptoms appear');
    }
  }

  if (data.poor_appetite && data.poor_sleep) {
    escalate('yellow', 'Both poor appetite and poor sleep reported', 'These together can indicate worsening heart failure — mention to doctor');
  } else if (data.poor_appetite) {
    escalate('yellow', 'Poor appetite reported', 'Try small, frequent meals');
  } else if (data.poor_sleep) {
    escalate('yellow', 'Poor sleep reported', 'Monitor — difficulty sleeping flat can be a CHF symptom');
  }

  // === GREEN (all clear) ===
  if (severity === 'green') {
    messages.push('All readings look stable today');
    recommendations.push('Keep up the good work with daily monitoring');
  }

  return { severity, messages, recommendations };
}

export function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'red': return 'Needs Attention Now';
    case 'yellow': return 'Watch Closely';
    case 'green': return 'Looking Good';
  }
}

export function getSeverityColor(severity: Severity) {
  switch (severity) {
    case 'red':
      return {
        bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800',
        dot: 'bg-red-500', badge: 'bg-red-100 text-red-700',
      };
    case 'yellow':
      return {
        bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
        dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700',
      };
    case 'green':
      return {
        bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
        dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',
      };
  }
}
