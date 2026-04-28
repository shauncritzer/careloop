import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  careloop: router({
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
                content: `You are a medical summary assistant for CareLoop, a caregiver companion app. Generate a clear, professional 7-day health summary for a doctor visit. Use plain English. NEVER use medical diagnosis language like "heart failure exacerbation" or "in danger". Instead say "contact doctor", "monitor closely", "seek urgent evaluation", "this may need medical attention". Include trend interpretations and personalized care recommendations. Keep the tone warm but professional.`,
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

    sendAlert: publicProcedure
      .input(z.object({
        patientName: z.string(),
        severity: z.string(),
        messages: z.array(z.string()),
        recipientEmail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log(`[CareLoop Alert] ${input.severity.toUpperCase()} for ${input.patientName}: ${input.messages.join(', ')}`);
        return { sent: true };
      }),

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

The caregiver's name is the person asking you questions. The patient is ${input.patientName}.

Recent health data for ${input.patientName}:
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
- If you don't know something, say so honestly and suggest asking the doctor.`,
              },
              ...historyMessages,
              {
                role: 'user',
                content: input.question,
              },
            ],
          });

          const content = response.choices?.[0]?.message?.content;
          return typeof content === 'string' ? content : 'I\'m sorry, I wasn\'t able to process that. Please try again.';
        } catch (error) {
          console.error('LLM assistant failed:', error);
          return 'I\'m having trouble connecting right now. Please try again in a moment.';
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
