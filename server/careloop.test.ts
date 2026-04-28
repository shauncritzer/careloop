import { describe, expect, it } from "vitest";

// Import alert engine directly — it's pure logic with no DOM dependencies
import { evaluateCheckIn, getSeverityLabel, getSeverityColor } from "../client/src/lib/alertEngine";
import type { CheckInData, BaselineData, Severity } from "../client/src/lib/alertEngine";

function makeCheckIn(overrides: Partial<CheckInData> = {}): CheckInData {
  return {
    weight_lbs: 180,
    systolic_bp: 120,
    diastolic_bp: 80,
    pulse_bpm: 72,
    spo2: 96,
    fluid_intake_oz: 48,
    sodium_mg: 1200,
    breathing_worse: false,
    swelling: false,
    confusion: false,
    dizziness: false,
    chest_pain: false,
    missed_meds: false,
    fall_or_near_fall: false,
    poor_appetite: false,
    poor_sleep: false,
    notes: null,
    ...overrides,
  };
}

const baseline: BaselineData = {
  baseline_weight_lbs: 180,
  baseline_sys_bp: 120,
  baseline_dia_bp: 80,
  baseline_pulse: 72,
  baseline_spo2: 96,
  fluid_limit_oz: 64,
  sodium_limit_mg: 1500,
};

describe("Alert Engine v2 — CHF-focused", () => {
  describe("GREEN scenarios", () => {
    it("returns green when all vitals are normal", () => {
      const result = evaluateCheckIn(makeCheckIn(), baseline);
      expect(result.severity).toBe("green");
      expect(result.messages).toContain("All readings look stable today");
    });

    it("returns green with partial data (only weight)", () => {
      const result = evaluateCheckIn(
        makeCheckIn({ systolic_bp: null, diastolic_bp: null, pulse_bpm: null, spo2: null }),
        baseline
      );
      expect(result.severity).toBe("green");
    });
  });

  describe("RED scenarios — call doctor immediately", () => {
    it("flags chest pain as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ chest_pain: true }), baseline);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("Chest pain"))).toBe(true);
    });

    it("flags confusion as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ confusion: true }), baseline);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("Confusion"))).toBe(true);
    });

    it("flags SpO2 below 90 as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ spo2: 88 }), baseline);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("critically low"))).toBe(true);
    });

    it("flags weight gain >= 3 lbs in one day as RED", () => {
      const yesterday = makeCheckIn({ weight_lbs: 180 });
      const today = makeCheckIn({ weight_lbs: 183.5 });
      const result = evaluateCheckIn(today, baseline, [yesterday]);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("rapid fluid retention"))).toBe(true);
    });

    it("flags weight gain >= 5 lbs over a week as RED", () => {
      const weekLogs = Array.from({ length: 6 }, (_, i) =>
        makeCheckIn({ weight_lbs: 180 + i * 0.5 })
      );
      const today = makeCheckIn({ weight_lbs: 186 });
      const result = evaluateCheckIn(today, baseline, weekLogs);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("past week"))).toBe(true);
    });

    it("flags dangerously high BP (>180) as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ systolic_bp: 195 }), baseline);
      expect(result.severity).toBe("red");
    });

    it("flags dangerously low BP (<80) as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ systolic_bp: 70 }), baseline);
      expect(result.severity).toBe("red");
    });

    it("flags fall or near-fall as RED", () => {
      const result = evaluateCheckIn(makeCheckIn({ fall_or_near_fall: true }), baseline);
      expect(result.severity).toBe("red");
      expect(result.messages.some(m => m.includes("Fall"))).toBe(true);
    });
  });

  describe("YELLOW scenarios — watch closely", () => {
    it("flags SpO2 90-93 as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ spo2: 92 }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags weight gain 2-3 lbs in one day as YELLOW", () => {
      const yesterday = makeCheckIn({ weight_lbs: 180 });
      const today = makeCheckIn({ weight_lbs: 182.5 });
      const result = evaluateCheckIn(today, baseline, [yesterday]);
      expect(result.severity).toBe("yellow");
    });

    it("flags breathing worse as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ breathing_worse: true }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags swelling as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ swelling: true }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags missed meds as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ missed_meds: true }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags fluid intake over limit as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ fluid_intake_oz: 80 }), baseline);
      expect(result.severity).toBe("yellow");
      expect(result.messages.some(m => m.includes("Fluid intake"))).toBe(true);
    });

    it("flags sodium over limit as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ sodium_mg: 2000 }), baseline);
      expect(result.severity).toBe("yellow");
      expect(result.messages.some(m => m.includes("Sodium"))).toBe(true);
    });

    it("flags elevated BP (150-180) as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ systolic_bp: 160 }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags low pulse (<50) as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ pulse_bpm: 45 }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags high pulse (>110) as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ pulse_bpm: 120 }), baseline);
      expect(result.severity).toBe("yellow");
    });

    it("flags poor appetite + poor sleep together as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ poor_appetite: true, poor_sleep: true }), baseline);
      expect(result.severity).toBe("yellow");
      expect(result.messages.some(m => m.includes("Both poor appetite and poor sleep"))).toBe(true);
    });

    it("flags dizziness as YELLOW", () => {
      const result = evaluateCheckIn(makeCheckIn({ dizziness: true }), baseline);
      expect(result.severity).toBe("yellow");
    });
  });

  describe("Severity escalation", () => {
    it("RED overrides YELLOW when both present", () => {
      const result = evaluateCheckIn(
        makeCheckIn({ chest_pain: true, swelling: true, missed_meds: true }),
        baseline
      );
      expect(result.severity).toBe("red");
      expect(result.messages.length).toBeGreaterThanOrEqual(3);
    });

    it("accumulates multiple YELLOW messages", () => {
      const result = evaluateCheckIn(
        makeCheckIn({ breathing_worse: true, swelling: true, dizziness: true }),
        baseline
      );
      expect(result.severity).toBe("yellow");
      expect(result.messages.length).toBe(3);
    });
  });

  describe("Safe language enforcement", () => {
    it("never uses forbidden medical terms", () => {
      const scenarios = [
        makeCheckIn({ chest_pain: true }),
        makeCheckIn({ confusion: true }),
        makeCheckIn({ spo2: 85 }),
        makeCheckIn({ fall_or_near_fall: true }),
      ];
      const forbidden = ["heart failure exacerbation", "in danger", "diagnose", "treat with"];

      for (const scenario of scenarios) {
        const result = evaluateCheckIn(scenario, baseline);
        for (const msg of [...result.messages, ...result.recommendations]) {
          for (const term of forbidden) {
            expect(msg.toLowerCase()).not.toContain(term);
          }
        }
      }
    });
  });

  describe("Utility functions", () => {
    it("getSeverityLabel returns correct labels", () => {
      expect(getSeverityLabel("red")).toBe("Needs Attention Now");
      expect(getSeverityLabel("yellow")).toBe("Watch Closely");
      expect(getSeverityLabel("green")).toBe("Looking Good");
    });

    it("getSeverityColor returns correct color objects", () => {
      const red = getSeverityColor("red");
      expect(red.bg).toContain("red");
      expect(red.text).toContain("red");

      const green = getSeverityColor("green");
      expect(green.bg).toContain("emerald");
    });
  });

  describe("Edge cases", () => {
    it("works without baseline data", () => {
      const result = evaluateCheckIn(makeCheckIn(), null);
      expect(result.severity).toBe("green");
    });

    it("skips fluid/sodium checks without baseline limits", () => {
      const result = evaluateCheckIn(
        makeCheckIn({ fluid_intake_oz: 200, sodium_mg: 5000 }),
        { ...baseline, fluid_limit_oz: null, sodium_limit_mg: null }
      );
      expect(result.messages.every(m => !m.includes("Fluid") && !m.includes("Sodium"))).toBe(true);
    });

    it("works with no previous logs", () => {
      const result = evaluateCheckIn(makeCheckIn(), baseline, []);
      expect(result.severity).toBe("green");
    });
  });
});
