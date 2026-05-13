import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import {
  getAppSettings, saveAppSettings,
  getPatient, savePatient,
  getDailyLogs, saveDailyLog,
  getAlerts, saveAlert,
  getFamilyMembers, addFamilyMember, getFamilyAccessByCode,
} from "./db";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  careloop: router({
    // ===== PIN AUTH =====
    getSetupStatus: publicProcedure.query(async () => {
      const settings = await getAppSettings();
      return { isSetUp: !!settings, caregiverName: settings?.caregiverName || null };
    }),

    setupPin: publicProcedure
      .input(z.object({ pinHash: z.string(), caregiverName: z.string() }))
      .mutation(async ({ input }) => {
        await saveAppSettings(input.pinHash, input.caregiverName);
        return { success: true };
      }),

    verifyPin: publicProcedure
      .input(z.object({ pinHash: z.string() }))
      .mutation(async ({ input }) => {
        const settings = await getAppSettings();
        if (!settings) return { valid: false, error: 'No PIN set up yet' };
        if (settings.pinHash !== input.pinHash) return { valid: false, error: 'Incorrect PIN' };
        return { valid: true, caregiverName: settings.caregiverName };
      }),

    // ===== PATIENT =====
    getPatient: publicProcedure.query(async () => {
      return await getPatient();
    }),

    savePatient: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        dateOfBirth: z.string().optional(),
        baselineWeightLbs: z.number().optional(),
        baselineSysBp: z.number().optional(),
        baselineDiaBp: z.number().optional(),
        baselinePulse: z.number().optional(),
        baselineSpo2: z.number().optional(),
        fluidLimitOz: z.number().optional(),
        sodiumLimitMg: z.number().optional(),
        caregiverName: z.string().optional(),
        familyContactName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await savePatient({
          name: input.name,
          dateOfBirth: input.dateOfBirth || null,
          baselineWeightLbs: input.baselineWeightLbs || null,
          baselineSysBp: input.baselineSysBp || null,
          baselineDiaBp: input.baselineDiaBp || null,
          baselinePulse: input.baselinePulse || null,
          baselineSpo2: input.baselineSpo2 || null,
          fluidLimitOz: input.fluidLimitOz || null,
          sodiumLimitMg: input.sodiumLimitMg || null,
          caregiverName: input.caregiverName || null,
          familyContactName: input.familyContactName || null,
        });
        return { id };
      }),

    // ===== DAILY LOGS =====
    getDailyLogs: publicProcedure
      .input(z.object({ patientId: z.number(), days: z.number().default(14) }))
      .query(async ({ input }) => {
        return await getDailyLogs(input.patientId, input.days);
      }),

    saveDailyLog: publicProcedure
      .input(z.object({
        patientId: z.number(),
        logDate: z.string(),
        weightLbs: z.number().nullable().optional(),
        systolicBp: z.number().nullable().optional(),
        diastolicBp: z.number().nullable().optional(),
        pulseBpm: z.number().nullable().optional(),
        spo2: z.number().nullable().optional(),
        fluidIntakeOz: z.number().nullable().optional(),
        sodiumMg: z.number().nullable().optional(),
        breathingWorse: z.boolean().default(false),
        swelling: z.boolean().default(false),
        confusion: z.boolean().default(false),
        dizziness: z.boolean().default(false),
        chestPain: z.boolean().default(false),
        missedMeds: z.boolean().default(false),
        fallOrNearFall: z.boolean().default(false),
        poorAppetite: z.boolean().default(false),
        poorSleep: z.boolean().default(false),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await saveDailyLog({
          patientId: input.patientId,
          logDate: input.logDate,
          weightLbs: input.weightLbs ?? null,
          systolicBp: input.systolicBp ?? null,
          diastolicBp: input.diastolicBp ?? null,
          pulseBpm: input.pulseBpm ?? null,
          spo2: input.spo2 ?? null,
          fluidIntakeOz: input.fluidIntakeOz ?? null,
          sodiumMg: input.sodiumMg ?? null,
          breathingWorse: input.breathingWorse,
          swelling: input.swelling,
          confusion: input.confusion,
          dizziness: input.dizziness,
          chestPain: input.chestPain,
          missedMeds: input.missedMeds,
          fallOrNearFall: input.fallOrNearFall,
          poorAppetite: input.poorAppetite,
          poorSleep: input.poorSleep,
          notes: input.notes ?? null,
        });
        return { id };
      }),

    // ===== ALERTS =====
    getAlerts: publicProcedure
      .input(z.object({ patientId: z.number(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return await getAlerts(input.patientId, input.limit);
      }),

    saveAlert: publicProcedure
      .input(z.object({
        patientId: z.number(),
        severity: z.enum(['green', 'yellow', 'red']),
        messages: z.array(z.string()),
        recommendations: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        await saveAlert({
          patientId: input.patientId,
          severity: input.severity,
          message: input.messages.join(' | '),
          recommendations: input.recommendations?.join(' | ') || null,
        });
        console.log(`[CareLoop Alert] ${input.severity.toUpperCase()}: ${input.messages.join(', ')}`);
        return { saved: true };
      }),

    // ===== FAMILY ACCESS =====
    getFamilyMembers: publicProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await getFamilyMembers(input.patientId);
      }),

    inviteFamilyMember: publicProcedure
      .input(z.object({ patientId: z.number(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const accessCode = nanoid(12);
        await addFamilyMember({
          patientId: input.patientId,
          invitedEmail: input.email,
          accessCode,
        });
        return { accessCode };
      }),

    getFamilyView: publicProcedure
      .input(z.object({ accessCode: z.string() }))
      .query(async ({ input }) => {
        const access = await getFamilyAccessByCode(input.accessCode);
        if (!access) return { authorized: false as const };
        const patient = await getPatient();
        if (!patient) return { authorized: false as const };
        const logs = await getDailyLogs(access.patientId, 7);
        const alertsList = await getAlerts(access.patientId, 5);
        return { authorized: true as const, patient, logs, alerts: alertsList };
      }),

    // ===== LLM: ASK ASSISTANT =====
    askAssistant: publicProcedure
      .input(z.object({
        question: z.string(),
        patientName: z.string(),
        recentData: z.string(),
        conversationHistory: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        try {
          const historyMessages = input.conversationHistory.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are a caring and knowledgeable assistant for CareLoop, a caregiver companion app for someone caring for a loved one with congestive heart failure (CHF).

The patient is ${input.patientName} (Lawrence "Larry" Critzer, age 79, DOB 2/23/1947).

Key clinical context for Larry:
- LVEF 35% (moderately reduced heart function)
- Paroxysmal atrial fibrillation (AFib) — monitored by implantable loop recorder, average heart rate ~90 bpm
- Discharge weight baseline: 176 lbs (April 30, 2026 — most recent hospitalization for CHF)
- Baseline blood pressure: ~158/98 mmHg (he runs hypertensive)
- COPD — uses Breztri inhaler twice daily; SpO2 should stay above 90%
- Stroke history (CVA 2021) — confusion or sudden weakness needs urgent attention
- Seizure disorder — on Keppra 500mg twice daily; missed doses are serious
- Active hepatocellular carcinoma (HCC) — under oncology care
- Key medications: Lasix 40mg 2x/day (diuretic), Eliquis 5mg 2x/day (blood thinner for AFib), Keppra 500mg 2x/day (seizures), Metoprolol XL 100mg (heart rate), Losartan 50mg (blood pressure), Farxiga 5mg (heart failure + diabetes)
- Allergies: Prednisone (hives), Rosuvastatin (muscle/joint pain)
- Cardiologist: Dr. Timothy Williams, MD — 434-817-1020
- Primary care: Dr. Robert Stokes Jr., MD
- Weight monitoring rule: call cardiologist for 3+ lbs in one day OR 5+ lbs in one week

Recent health data:
${input.recentData}

Guidelines:
- Be warm, supportive, and clear. This caregiver is stressed and worried.
- Explain things in plain language, not medical jargon.
- When discussing concerning readings, be honest but not alarming.
- Always recommend confirming with the doctor or care team for important decisions.
- NEVER diagnose, prescribe, or say things like "in danger" or "heart failure exacerbation".
- DO say "contact doctor", "monitor closely", "this may need medical attention".
- Help interpret weight changes, BP readings, fluid/sodium intake, and symptoms in the context of CHF.
- Be specific about what numbers mean and what to watch for.
- Keep responses concise but thorough. Use bullet points when helpful.
- If you don't know something, say so honestly and suggest asking the doctor.
- When relevant, reference Larry's specific medications, baseline values, or clinical history to give personalized answers.`,
              },
              ...historyMessages,
              { role: 'user', content: input.question },
            ],
          });

          const content = response.choices?.[0]?.message?.content;
          return typeof content === 'string' ? content : 'I\'m sorry, I wasn\'t able to process that. Please try again.';
        } catch (error) {
          console.error('LLM assistant failed:', error);
          return 'I\'m having trouble connecting right now. Please try again in a moment.';
        }
      }),

    // ===== LLM: ANALYZE MEAL (food photo → sodium estimate) =====
    analyzeMeal: publicProcedure
      .input(z.object({
        imageBase64: z.string(), // base64-encoded image data (no data: prefix)
        mimeType: z.string().default('image/jpeg'),
        patientSodiumLimitMg: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are a nutrition analysis assistant specializing in sodium content estimation for CHF (congestive heart failure) patients. Your job is to analyze food photos and estimate sodium content accurately.

Guidelines:
- Identify all visible food items and estimate portion sizes
- Provide sodium estimates in milligrams (mg)
- Be conservative (round up slightly) since CHF patients need to avoid exceeding limits
- Flag high-sodium items clearly
- Common high-sodium items: canned soups (800-1200mg), deli meats (500-900mg per serving), cheese (200-400mg), bread (150-200mg per slice), condiments (200-600mg)
- Common lower-sodium items: fresh fruits/vegetables (<50mg), plain meat/poultry (75-100mg), eggs (70mg)
- Always respond in the exact JSON format requested`,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${input.mimeType};base64,${input.imageBase64}`,
                      detail: 'high',
                    },
                  },
                  {
                    type: 'text',
                    text: `Analyze this meal photo and estimate the sodium content. Respond ONLY with valid JSON in this exact format:
{
  "foods": [
    { "name": "food item name", "portion": "estimated portion", "sodiumMg": 250 }
  ],
  "totalSodiumMg": 850,
  "confidence": "high|medium|low",
  "notes": "brief note about accuracy or high-sodium items to watch",
  "highSodiumWarning": true
}

If you cannot identify the food clearly, set confidence to "low" and provide your best estimate.`,
                  },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'meal_analysis',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    foods: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          portion: { type: 'string' },
                          sodiumMg: { type: 'number' },
                        },
                        required: ['name', 'portion', 'sodiumMg'],
                        additionalProperties: false,
                      },
                    },
                    totalSodiumMg: { type: 'number' },
                    confidence: { type: 'string' },
                    notes: { type: 'string' },
                    highSodiumWarning: { type: 'boolean' },
                  },
                  required: ['foods', 'totalSodiumMg', 'confidence', 'notes', 'highSodiumWarning'],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          if (typeof rawContent === 'string') {
            const parsed = JSON.parse(rawContent);
            return {
              success: true as const,
              foods: parsed.foods as Array<{ name: string; portion: string; sodiumMg: number }>,
              totalSodiumMg: parsed.totalSodiumMg as number,
              confidence: parsed.confidence as string,
              notes: parsed.notes as string,
              highSodiumWarning: parsed.highSodiumWarning as boolean,
            };
          }
          return { success: false as const, error: 'Could not parse meal analysis' };
        } catch (error) {
          console.error('Meal analysis failed:', error);
          return { success: false as const, error: 'Meal analysis failed. Please try again.' };
        }
      }),

    // ===== LLM: DOCTOR SUMMARY =====
    generateSummary: publicProcedure
      .input(z.object({
        patientName: z.string(),
        basicSummary: z.string(),
        logsJson: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are a medical summary assistant for CareLoop. Generate a clear, professional 7-day health summary for a doctor visit.

Patient context for Lawrence "Larry" Critzer (DOB 2/23/1947):
- LVEF 35% (moderately reduced systolic dysfunction)
- Paroxysmal AFib (ILR-confirmed avg rate 90 bpm)
- Discharge weight baseline: 176 lbs (April 30, 2026)
- Baseline BP: ~158/98 mmHg (patient runs hypertensive)
- COPD (Breztri inhaler 2x/day)
- Stroke history (CVA 2021) + seizure disorder (Keppra 500mg 2x/day)
- Active HCC (hepatocellular carcinoma)
- Key meds: Lasix 40mg 2x/day, Eliquis 5mg 2x/day, Metoprolol XL 100mg, Losartan 50mg, Farxiga 5mg
- Weight alert thresholds: call cardiologist for 3+ lbs in one day OR 5+ lbs in one week
- Cardiologist: Dr. Timothy Williams, MD (434-817-1020)
- Primary care: Dr. Robert Stokes Jr., MD

Guidelines:
- Use plain English. NEVER use medical diagnosis language.
- Instead say "contact doctor", "monitor closely", "seek urgent evaluation".
- Include trend interpretations and personalized care recommendations.
- Reference Larry's specific baseline values when interpreting readings.
- Keep the tone warm but professional.`,
              },
              {
                role: 'user',
                content: `Generate an enhanced 7-day doctor summary for patient ${input.patientName}.\n\nBasic summary:\n${input.basicSummary}\n\nRaw daily log data:\n${input.logsJson}\n\nPlease provide:\n1. A clear narrative summary of the past 7 days\n2. Notable trends or patterns\n3. Areas that may need medical attention\n4. Care recommendations\n\nFormat as a clean, readable report suitable for sharing with a doctor.`,
              },
            ],
          });
          const rawContent = response.choices?.[0]?.message?.content;
          const summary: string = typeof rawContent === 'string' ? rawContent : input.basicSummary;
          return { summary };
        } catch (error) {
          console.error('LLM summary generation failed:', error);
          return { summary: input.basicSummary };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
