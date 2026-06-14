import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  clearHealingAndErrorHistory,
  getDemoUserId,
  getHealingHistory,
  getLatestHealthState,
  getRecentAppErrors,
  logAppError,
} from "../db";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const healingRouter = router({
  // 1. Log an error encountered by a user/system action
  logError: protectedProcedure
    .input(
      z.object({
        errorMessage: z.string().min(1),
        errorStack: z.string().optional().nullable(),
        errorCode: z.string().optional().nullable(),
        severity: z
          .enum(["info", "warning", "error", "critical"])
          .default("error"),
        component: z.string().default("unknown"),
        context: z.any().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return logAppError({
        userId,
        errorMessage: input.errorMessage,
        errorStack: input.errorStack,
        errorCode: input.errorCode,
        severity: input.severity,
        component: input.component,
        context: input.context,
      });
    }),

  // 2. Fetch list of errors (scoped to calling user unless admin)
  getRecentErrors: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        includeResolved: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getRecentAppErrors(userId, input.limit, input.includeResolved);
    }),

  // 3. Fetch healing action execution history (scoped to calling user unless admin)
  getHealingHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getHealingHistory(userId, input.limit);
    }),

  // 4. Fetch the latest recorded system health check (scoped to calling user unless admin)
  getHealthState: protectedProcedure
    .input(z.void().optional())
    .query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getLatestHealthState(userId);
    }),

  // 5. Clean up history logs (restricted to administrators)
  clearHistory: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().int().min(1).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await clearHealingAndErrorHistory(userId, input.olderThanDays);
      return { success: true };
    }),
});
