import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Alert Engine Tests (pure logic, no DB) ----

// We can't import from client/src directly in server tests, so we replicate the
// core evaluateAlerts logic inline for testing. In production the same code runs
// in the browser.

type Severity = 'green' | 'yellow' | 'red';

interface AlertResult {
  severity: Severity;
  messages: string[];
}

interface DailyLogInput {
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

interface PatientBaseline {
  baseline_weight_lbs: number | null;
  baseline_sys_bp: number | null;
  baseline_dia_bp: number | null;
  baseline_pulse: number | null;
  baseline_spo2: number | null;
}

interface HistoricalData {
  yesterdayWeight: number | null;
  sevenDayWeights: number[];
  previousDayPoorSleep: boolean;
}

function evaluateAlerts(
  log: DailyLogInput,
  baseline: PatientBaseline,
  history: HistoricalData
): AlertResult {
  const redMessages: string[] = [];
  const yellowMessages: string[] = [];

  if (log.weight_lbs != null && history.yesterdayWeight != null) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 3) {
      redMessages.push(`Weight increased by ${gain.toFixed(1)} lbs since yesterday. Please seek urgent evaluation.`);
    }
  }

  if (log.spo2 != null && log.spo2 < 90) {
    redMessages.push(`Oxygen level is ${log.spo2}%, which is below 90%. Please contact doctor immediately.`);
  }

  if (log.severe_confusion) {
    redMessages.push('Severe confusion reported. This may need urgent medical attention. Please contact doctor.');
  }

  if (log.fall_or_near_fall) {
    redMessages.push('A fall or near-fall was reported. Please contact doctor for evaluation.');
  }

  if (log.breathing_worse && log.spo2 != null && baseline.baseline_spo2 != null && log.spo2 < baseline.baseline_spo2 - 3) {
    redMessages.push(`Breathing is worse and oxygen is ${log.spo2}%, below baseline. Please seek urgent evaluation.`);
  }

  if (log.systolic_bp != null) {
    if (log.systolic_bp < 90) {
      redMessages.push(`Blood pressure is low at ${log.systolic_bp} systolic. Please contact doctor immediately.`);
    }
    if (log.systolic_bp > 180) {
      redMessages.push(`Blood pressure is very high at ${log.systolic_bp} systolic. Please contact doctor immediately.`);
    }
  }

  if (log.weight_lbs != null && history.yesterdayWeight != null) {
    const gain = log.weight_lbs - history.yesterdayWeight;
    if (gain >= 2 && gain < 3) {
      yellowMessages.push(`Weight increased by ${gain.toFixed(1)} lbs since yesterday. Monitor closely.`);
    }
  }

  if (log.weight_lbs != null && history.sevenDayWeights.length > 0) {
    const earliest = history.sevenDayWeights[0];
    if (earliest != null) {
      const gain7 = log.weight_lbs - earliest;
      if (gain7 >= 5) {
        yellowMessages.push(`Weight has increased by ${gain7.toFixed(1)} lbs over the past 7 days. Monitor closely.`);
      }
    }
  }

  if (log.mild_confusion) {
    yellowMessages.push('Mild confusion reported. Monitor closely.');
  }

  if (log.stomach_pain_bent_over) {
    yellowMessages.push('Stomach pain reported. Monitor closely and contact doctor if it persists.');
  }

  if (log.swelling) {
    yellowMessages.push('Swelling reported. Monitor closely and contact doctor if it worsens.');
  }

  if (log.poor_sleep && history.previousDayPoorSleep) {
    yellowMessages.push('Poor sleep for 2 consecutive days. Monitor closely.');
  }

  if (!log.lasix_taken) {
    yellowMessages.push('Lasix was not taken today. Please ensure medication adherence.');
  }

  if (!log.all_meds_taken) {
    yellowMessages.push('Not all medications were taken today. Please review medication schedule.');
  }

  if (log.spo2 != null && log.spo2 >= 90 && log.spo2 <= 93) {
    yellowMessages.push(`Oxygen level is ${log.spo2}%, which is lower than ideal. Monitor closely.`);
  }

  if (log.pulse_bpm != null) {
    if (log.pulse_bpm < 50) {
      yellowMessages.push(`Pulse is low at ${log.pulse_bpm} bpm. Monitor closely and contact doctor if symptoms appear.`);
    }
    if (log.pulse_bpm > 110) {
      yellowMessages.push(`Pulse is elevated at ${log.pulse_bpm} bpm. Monitor closely and contact doctor if symptoms appear.`);
    }
  }

  if (redMessages.length > 0) {
    return { severity: 'red', messages: [...redMessages, ...yellowMessages] };
  }
  if (yellowMessages.length > 0) {
    return { severity: 'yellow', messages: yellowMessages };
  }
  return { severity: 'green', messages: ['All readings are within normal range. Keep up the great care!'] };
}

// Default healthy log
function makeHealthyLog(): DailyLogInput {
  return {
    weight_lbs: 180,
    systolic_bp: 120,
    diastolic_bp: 80,
    pulse_bpm: 72,
    spo2: 97,
    breathing_worse: false,
    mild_confusion: false,
    severe_confusion: false,
    stomach_pain_bent_over: false,
    swelling: false,
    poor_sleep: false,
    weak_exhausted: false,
    poor_appetite: false,
    cough_worse: false,
    fall_or_near_fall: false,
    lasix_taken: true,
    all_meds_taken: true,
    ambien_taken_last_night: false,
  };
}

const defaultBaseline: PatientBaseline = {
  baseline_weight_lbs: 180,
  baseline_sys_bp: 120,
  baseline_dia_bp: 80,
  baseline_pulse: 72,
  baseline_spo2: 97,
};

const defaultHistory: HistoricalData = {
  yesterdayWeight: 180,
  sevenDayWeights: [178, 179, 180, 180, 179, 180, 180],
  previousDayPoorSleep: false,
};

describe("Alert Engine", () => {
  it("returns green for healthy readings", () => {
    const result = evaluateAlerts(makeHealthyLog(), defaultBaseline, defaultHistory);
    expect(result.severity).toBe("green");
    expect(result.messages.length).toBe(1);
    expect(result.messages[0]).toContain("normal range");
  });

  it("returns red for SpO2 < 90", () => {
    const log = { ...makeHealthyLog(), spo2: 88 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("88%"))).toBe(true);
    expect(result.messages.some(m => m.includes("contact doctor"))).toBe(true);
  });

  it("returns red for weight gain >= 3 lbs from yesterday", () => {
    const log = { ...makeHealthyLog(), weight_lbs: 184 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("4.0 lbs"))).toBe(true);
  });

  it("returns red for severe confusion", () => {
    const log = { ...makeHealthyLog(), severe_confusion: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("Severe confusion"))).toBe(true);
  });

  it("returns red for fall or near-fall", () => {
    const log = { ...makeHealthyLog(), fall_or_near_fall: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("fall"))).toBe(true);
  });

  it("returns red for systolic BP < 90", () => {
    const log = { ...makeHealthyLog(), systolic_bp: 85 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("low at 85"))).toBe(true);
  });

  it("returns red for systolic BP > 180", () => {
    const log = { ...makeHealthyLog(), systolic_bp: 195 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("very high at 195"))).toBe(true);
  });

  it("returns red for breathing worse + SpO2 below baseline - 3", () => {
    const log = { ...makeHealthyLog(), breathing_worse: true, spo2: 93 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    expect(result.messages.some(m => m.includes("Breathing is worse"))).toBe(true);
  });

  it("returns yellow for weight gain 2-3 lbs from yesterday", () => {
    const log = { ...makeHealthyLog(), weight_lbs: 182.5 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("2.5 lbs"))).toBe(true);
  });

  it("returns yellow for 7-day weight gain >= 5 lbs", () => {
    const log = { ...makeHealthyLog(), weight_lbs: 185 };
    const history = { ...defaultHistory, yesterdayWeight: 184, sevenDayWeights: [179, 180, 181, 182, 183, 184, 185] };
    const result = evaluateAlerts(log, defaultBaseline, history);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("past 7 days"))).toBe(true);
  });

  it("returns yellow for mild confusion", () => {
    const log = { ...makeHealthyLog(), mild_confusion: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("Mild confusion"))).toBe(true);
  });

  it("returns yellow for swelling", () => {
    const log = { ...makeHealthyLog(), swelling: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("Swelling"))).toBe(true);
  });

  it("returns yellow for missed lasix", () => {
    const log = { ...makeHealthyLog(), lasix_taken: false };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("Lasix"))).toBe(true);
  });

  it("returns yellow for SpO2 between 90-93", () => {
    const log = { ...makeHealthyLog(), spo2: 92 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("92%"))).toBe(true);
  });

  it("returns yellow for low pulse < 50", () => {
    const log = { ...makeHealthyLog(), pulse_bpm: 45 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("45 bpm"))).toBe(true);
  });

  it("returns yellow for high pulse > 110", () => {
    const log = { ...makeHealthyLog(), pulse_bpm: 120 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("120 bpm"))).toBe(true);
  });

  it("returns yellow for 2 consecutive days of poor sleep", () => {
    const log = { ...makeHealthyLog(), poor_sleep: true };
    const history = { ...defaultHistory, previousDayPoorSleep: true };
    const result = evaluateAlerts(log, defaultBaseline, history);
    expect(result.severity).toBe("yellow");
    expect(result.messages.some(m => m.includes("Poor sleep for 2 consecutive"))).toBe(true);
  });

  it("does NOT flag poor sleep if only 1 day", () => {
    const log = { ...makeHealthyLog(), poor_sleep: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    // poor_sleep alone should not trigger the consecutive-day alert
    expect(result.messages.some(m => m.includes("Poor sleep for 2 consecutive"))).toBe(false);
  });

  it("red overrides yellow when both present", () => {
    const log = { ...makeHealthyLog(), spo2: 88, mild_confusion: true };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    expect(result.severity).toBe("red");
    // Should include both red and yellow messages
    expect(result.messages.some(m => m.includes("88%"))).toBe(true);
    expect(result.messages.some(m => m.includes("Mild confusion"))).toBe(true);
  });

  it("never uses prohibited medical language", () => {
    const prohibited = ["heart failure exacerbation", "in danger", "diagnose", "treat with"];
    // Test with multiple alert conditions
    const log = { ...makeHealthyLog(), spo2: 85, severe_confusion: true, fall_or_near_fall: true, systolic_bp: 200 };
    const result = evaluateAlerts(log, defaultBaseline, defaultHistory);
    for (const msg of result.messages) {
      for (const term of prohibited) {
        expect(msg.toLowerCase()).not.toContain(term);
      }
    }
  });
});

// ---- tRPC Router Tests ----

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("careloop.sendAlert", () => {
  it("returns sent: true for a valid alert", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.careloop.sendAlert({
      patientName: "John Doe",
      severity: "red",
      messages: ["SpO2 is 85%. Please contact doctor immediately."],
    });

    expect(result).toEqual({ sent: true });
  });

  it("accepts optional recipientEmail", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.careloop.sendAlert({
      patientName: "Jane Doe",
      severity: "yellow",
      messages: ["Mild confusion reported."],
      recipientEmail: "family@example.com",
    });

    expect(result).toEqual({ sent: true });
  });
});
