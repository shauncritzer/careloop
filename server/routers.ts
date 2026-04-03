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
        // In-app alert notification - stored in Supabase alerts table
        // Email notification would be sent via Supabase Edge Functions or external service
        console.log(`[CareLoop Alert] ${input.severity.toUpperCase()} for ${input.patientName}: ${input.messages.join(', ')}`);
        return { sent: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
