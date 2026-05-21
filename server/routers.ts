import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addAnimal,
  getAllEventsForExport,
  getActiveAnimal,
  getAnimalsByUser,
  getEventsPaginated,
  getOrCreateDemoUserId,
  getRecentEvents,
  getSettings,
  getWeeklyStats,
  insertEvent,
  setActiveAnimal,
  updateEventFeedback,
  upsertSettings,
  getDemoUserId,
} from "./db";
import type { EmotionalState, ModelUsed } from "../shared/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

const STATE_EMOJIS: Record<EmotionalState, string> = {
  distress:   "🔴",
  attention:  "🟡",
  excitement: "🟢",
  hunger:     "🟠",
  alert:      "🔵",
  relaxed:    "⚪",
};

const MODELS: ModelUsed[] = ["yamnet", "wav2vec2", "gemini"];

function randomClassify(): {
  state: EmotionalState;
  confidence: number;
  emoji: string;
  model_used: ModelUsed;
  cached: boolean;
} {
  const state = STATES[Math.floor(Math.random() * STATES.length)];
  const confidence = Math.round((0.60 + Math.random() * 0.39) * 100) / 100;
  const model_used = MODELS[Math.floor(Math.random() * MODELS.length)];
  return { state, confidence, emoji: STATE_EMOJIS[state], model_used, cached: false };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Effective user ID (demo fallback) ───────────────────────────────────────

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Classify ────────────────────────────────────────────────────────────────
  classify: router({
    run: publicProcedure
      .input(
        z.object({
          animalId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Simulate 2-second processing
        await sleep(2000);
        const result = randomClassify();
        const userId = await effectiveUserId(ctx.user);

        // Persist event
        const event = await insertEvent({
          userId,
          animalId: input.animalId || 1,
          state: result.state,
          confidence: result.confidence,
          emoji: result.emoji,
          modelUsed: result.model_used,
          cached: result.cached,
        });

        return { ...result, eventId: (event as any)?.id };
      }),
  }),

  // ── Animals ─────────────────────────────────────────────────────────────────
  animals: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getAnimalsByUser(userId);
    }),

    add: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          species: z.enum(["dog", "cat"]),
          breed: z.string().max(100).optional(),
          age: z.number().int().min(0).max(30).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return addAnimal({ ...input, userId });
      }),

    setActive: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await setActiveAnimal(input.animalId, userId);
        return { success: true };
      }),

    getActive: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getActiveAnimal(userId);
    }),

    weeklyStats: publicProcedure
      .input(z.object({ animalId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getWeeklyStats(userId, input.animalId);
      }),
  }),

  // ── Events ──────────────────────────────────────────────────────────────────
  events: router({
    recent: publicProcedure
      .input(z.object({ limit: z.number().default(5) }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getRecentEvents(userId, input.limit);
      }),

    list: publicProcedure
      .input(
        z.object({
          page:     z.number().default(1),
          pageSize: z.number().default(10),
          state:    z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo:   z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getEventsPaginated(
          userId,
          input.page,
          input.pageSize,
          input.state,
          input.dateFrom,
          input.dateTo
        );
      }),

    feedback: publicProcedure
      .input(
        z.object({
          eventId:  z.number(),
          feedback: z.enum(["correct", "incorrect"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await updateEventFeedback(input.eventId, userId, input.feedback);
        return { success: true };
      }),

    exportCsv: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      const events = await getAllEventsForExport(userId);
      const header = "id,state,confidence,emoji,model_used,cached,feedback,created_at";
      const rows = events.map((e: any) =>
        [
          e.id,
          e.state,
          e.confidence,
          e.emoji,
          e.model_used,
          e.cached,
          e.feedback ?? "",
          new Date(e.created_at).toISOString(),
        ].join(",")
      );
      return { csv: [header, ...rows].join("\n") };
    }),
  }),

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: router({
    get: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      const s = await getSettings(userId);
      return (
        s ?? {
          notificationsEnabled: true,
          alertSensitivity: "medium" as const,
        }
      );
    }),

    update: publicProcedure
      .input(
        z.object({
          notificationsEnabled: z.boolean().optional(),
          alertSensitivity:     z.enum(["low", "medium", "high"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return upsertSettings(userId, input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
