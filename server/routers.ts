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
  getEventNotes,
  updateEventNotes,
  uploadAudioToSupabase,
  updateEventAudio,
  getAnimalById,
  getAnimalBaseline,
  updateAnimalBaseline,
  verifyAnimalOwner,
  getEventsForAnimalPaginated,
  getStatsForAnimal,
  updateBeliefStateForAnimal,
  getLatestBeliefState,
  getEventBeliefState,
  getEventPosture,
  savePostureForEvent,
  shareReportWithVet,
  createShareInvitation,
  getPendingInvitations,
  respondToInvitation,
  getAnimalShares,
  removeAnimalShare,
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
          audio: z.string().optional(),
          audioMimeType: z.string().optional(),
          posture: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let result: {
          state: EmotionalState;
          confidence: number;
          emoji: string;
          model_used: ModelUsed;
          cached: boolean;
        } | null = null;

        const buffer = input.audio ? Buffer.from(input.audio, "base64") : null;
        const mime = input.audioMimeType || "audio/webm";
        // Get file extension from mime
        let ext = "webm";
        if (mime.includes("wav")) ext = "wav";
        else if (mime.includes("mp4")) ext = "mp4";
        else if (mime.includes("ogg")) ext = "ogg";
        else if (mime.includes("mpeg")) ext = "mp3";

        if (process.env.FASTAPI_BACKEND_URL && buffer) {
          try {
            const file = new File([buffer], `audio.${ext}`, { type: mime });
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${process.env.FASTAPI_BACKEND_URL}/classify`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`FastAPI responded with status: ${response.status}`);
            }

            const data = await response.json() as {
              state: string;
              confidence: number;
              emoji: string;
              model_used: string;
            };

            // Map returned model_used to our ModelUsed type
            let modelUsedMapped: ModelUsed = "yamnet";
            if (data.model_used === "wav2vec2") modelUsedMapped = "wav2vec2";
            else if (data.model_used === "gemini") modelUsedMapped = "gemini";
            else if (data.model_used.includes("yamnet")) modelUsedMapped = "yamnet";

            if (STATES.includes(data.state as EmotionalState)) {
              result = {
                state: data.state as EmotionalState,
                confidence: data.confidence,
                emoji: data.emoji || STATE_EMOJIS[data.state as EmotionalState],
                model_used: modelUsedMapped,
                cached: false,
              };
              console.log("[Classify] Classification from FastAPI successful:", result);
            } else {
              console.warn(`[Classify] FastAPI returned invalid state "${data.state}", using fallback.`);
            }
          } catch (err) {
            console.error("[Classify] FastAPI call failed, falling back to random classification:", err);
          }
        }

        if (!result) {
          // Simulate 2-second processing
          await sleep(2000);
          result = randomClassify();
        }

        const userId = await effectiveUserId(ctx.user);
        const targetAnimalId = input.animalId || 1;
        await verifyAnimalOwner(targetAnimalId, userId, true);

        // Persist event
        const event = await insertEvent({
          userId,
          animalId: targetAnimalId,
          state: result.state,
          confidence: result.confidence,
          emoji: result.emoji,
          modelUsed: result.model_used,
          cached: result.cached,
        });

        const eventId = (event as any)?.id;

        // If audio data is provided, upload it to Supabase Storage and map it
        let audioUrl = null;
        if (eventId && buffer) {
          try {
            const fileName = `audio_${eventId}_${Date.now()}.${ext}`;
            audioUrl = await uploadAudioToSupabase(fileName, buffer, mime);
            await updateEventAudio(eventId, audioUrl);
          } catch (err) {
            console.error("[Classify] Failed to upload audio:", err);
          }
        }

        let beliefState = null;
        if (eventId) {
          const animalId = input.animalId || 1;
          beliefState = await updateBeliefStateForAnimal(animalId, result.state, result.confidence, eventId);
          if (input.posture) {
            await savePostureForEvent(eventId, input.posture);
          }
        }

        return { ...result, eventId, audioUrl, beliefState, posture: input.posture || null };
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

    get: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const animal = await getAnimalById(input.animalId, userId);
        if (!animal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Animal não encontrado ou não pertence a este utilizador.",
          });
        }
        return animal;
      }),

    getBaseline: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getAnimalBaseline(input.animalId);
      }),

    updateBaseline: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          vocalizationThreshold: z.number().int().min(1).max(100).optional(),
          normalStates: z.array(z.string()).optional(),
          alertSensitivity: z.enum(["low", "medium", "high"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return updateAnimalBaseline(input.animalId, input);
      }),

    getBeliefState: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getLatestBeliefState(input.animalId);
      }),

    inviteShare: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          email: z.string().email(),
          permission: z.enum(["read", "write"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const animal = await getAnimalById(input.animalId, userId);
        if (!animal) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Apenas o proprietario pode convidar co-tutores.",
          });
        }
        return createShareInvitation(userId, input.animalId, input.email, input.permission);
      }),

    listShares: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getAnimalShares(input.animalId);
      }),

    removeShare: publicProcedure
      .input(z.object({ shareId: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const animal = await getAnimalById(input.animalId, userId);
        if (!animal) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Apenas o proprietario pode revogar partilhas.",
          });
        }
        await removeAnimalShare(userId, input.shareId);
        return { success: true };
      }),

    getPendingInvitations: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getPendingInvitations(userId);
    }),

    respondToInvitation: publicProcedure
      .input(
        z.object({
          invitationId: z.number(),
          action: z.enum(["accept", "reject"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await respondToInvitation(userId, input.invitationId, input.action);
        return { success: true };
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
      const header = "id,state,confidence,emoji,model_used,cached,feedback,audio_url,created_at";
      const rows = events.map((e: any) =>
        [
          e.id,
          e.state,
          e.confidence,
          e.emoji,
          e.model_used,
          e.cached,
          e.feedback ?? "",
          e.audio_url ?? "",
          new Date(e.created_at).toISOString(),
        ].join(",")
      );
      return { csv: [header, ...rows].join("\n") };
    }),

    getNotes: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return getEventNotes(input.eventId);
      }),

    updateNotes: publicProcedure
      .input(
        z.object({
          eventId: z.number(),
          notes:   z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const notes = await updateEventNotes(input.eventId, input.notes);
        return { success: true, notes };
      }),

    listForAnimal: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          page: z.number().default(1),
          pageSize: z.number().default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getEventsForAnimalPaginated(
          input.animalId,
          userId,
          input.page,
          input.pageSize
        );
      }),

    statsForAnimal: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          days: z.number().default(7),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getStatsForAnimal(input.animalId, userId, input.days);
      }),

    getVisualMetadata: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const posture = await getEventPosture(input.eventId);
        const beliefState = await getEventBeliefState(input.eventId);
        return { posture, beliefState };
      }),
  }),

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: router({
    get: publicProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      const s = await getSettings(userId);
      if (!s) {
        return {
          notificationsEnabled: true,
          alertSensitivity: "medium" as const,
        };
      }
      return {
        notificationsEnabled: s.notifications_enabled,
        alertSensitivity: s.alert_sensitivity as "low" | "medium" | "high",
      };
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

  // ── Vet ─────────────────────────────────────────────────────────────────────
  vet: router({
    shareReport: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          name: z.string().min(1),
          email: z.string().email(),
          note: z.string().optional().default(""),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        await shareReportWithVet(input.animalId, {
          name: input.name,
          email: input.email,
          note: input.note,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
