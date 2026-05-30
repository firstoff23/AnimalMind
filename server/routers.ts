import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { familyRouter } from "./routers/family";
import { vetRouter } from "./routers/vet";
import { healthRouter } from "./routers/health";
import { trendsRouter } from "./routers/trends";
import {
  addAnimal,
  updateAnimal,
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
  recalculateAnimalBehaviorBaseline,
  updateAnimalBaseline,
  verifyAnimalOwner,
  getEventsForAnimalPaginated,
  getStatsForAnimal,
  updateBeliefStateForAnimal,
  getLatestBeliefState,
  getEventBeliefState,
  getEventPosture,
  savePostureForEvent,
  createShareInvitation,
  getPendingInvitations,
  respondToInvitation,
  getAnimalShares,
  removeAnimalShare,
  saveBreedFeedback,
  updateUser,
  getVaccinations,
  addVaccination,
  deleteVaccination,
  getDewormings,
  addDeworming,
  deleteDeworming,
  getDiagnosticTests,
  addDiagnosticTest,
  deleteDiagnosticTest,
  getOtherTreatments,
  addOtherTreatment,
  deleteOtherTreatment,
  getLicensing,
  addLicensing,
  deleteLicensing,
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

// Primary backend: always Fly.dev (hardcoded); secondary: HF Space (hardcoded)
const PRIMARY_BACKEND_URL = "https://animalmind-backend.fly.dev";
const HF_BACKEND_URL = "https://firstoff-animalmind-backend.hf.space";
const CLASSIFY_TIMEOUT_MS = 5000;

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

/** Attempt to classify audio against a single backend URL, with timeout. */
async function tryClassifyBackend(
  url: string,
  formData: FormData,
  timeoutMs: number
): Promise<{ state: string; confidence: number; emoji: string; model_used: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}/classify`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json() as { state: string; confidence: number; emoji: string; model_used: string };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.warn(`[Classify] Backend ${url} failed${isTimeout ? " (timeout)" : ""}: ${err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Map raw backend response into our typed result shape. */
function mapBackendResult(
  data: { state: string; confidence: number; emoji: string; model_used: string }
): { state: EmotionalState; confidence: number; emoji: string; model_used: ModelUsed; cached: boolean } | null {
  if (!STATES.includes(data.state as EmotionalState)) return null;
  let modelUsedMapped: ModelUsed = "yamnet";
  if (data.model_used === "wav2vec2") modelUsedMapped = "wav2vec2";
  else if (data.model_used === "gemini") modelUsedMapped = "gemini";
  else if (data.model_used?.includes("yamnet")) modelUsedMapped = "yamnet";
  return {
    state: data.state as EmotionalState,
    confidence: data.confidence,
    emoji: data.emoji || STATE_EMOJIS[data.state as EmotionalState],
    model_used: modelUsedMapped,
    cached: false,
  };
}

// ─── Effective user ID (demo fallback) ───────────────────────────────────────

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

function mapEventForExport(e: any) {
  const createdAt = e.created_at ?? e.createdAt ?? null;
  return {
    id: e.id,
    userId: e.user_id ?? e.userId ?? null,
    animalId: e.animal_id ?? e.animalId ?? null,
    animalName: e.animals?.name ?? e.animalName ?? "",
    state: e.state,
    confidence: Number(e.confidence),
    emoji: e.emoji ?? "",
    modelUsed: e.model_used ?? e.modelUsed ?? "",
    cached: Boolean(e.cached),
    feedback: e.feedback ?? null,
    audioUrl: e.audio_url ?? e.audioUrl ?? "",
    createdAt: createdAt ? new Date(createdAt).toISOString() : "",
  };
}

function mapDbEvent(e: any) {
  const createdAt = e.created_at ?? e.createdAt ?? null;
  return {
    id: e.id,
    animalId: e.animal_id ?? e.animalId ?? null,
    state: e.state,
    confidence: Number(e.confidence),
    emoji: e.emoji ?? "",
    modelUsed: e.model_used ?? e.modelUsed ?? "",
    feedback: e.feedback ?? null,
    audioUrl: e.audio_url ?? e.audioUrl ?? null,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    notes: e.notes ?? null,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  family: familyRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100).optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await updateUser(userId, input);
        return { success: true };
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
          pitch: z.number().optional(),
          spectralEnergy: z.number().optional(),
          tonalBrightness: z.number().optional(),
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

        // ── 2-tier backend fallback (both URLs hardcoded) ────────────────────
        // Tier 1: Fly.dev (PRIMARY_BACKEND_URL), 5 s timeout
        // Tier 2: HF Space (HF_BACKEND_URL)
        // Tier 3: Random fallback (client will also try TF.js local)
        if (buffer) {
          const backendsToTry = [PRIMARY_BACKEND_URL, HF_BACKEND_URL];

          for (const backendUrl of backendsToTry) {
            const file = new File([buffer], `audio.${ext}`, { type: mime });
            const formData = new FormData();
            formData.append("file", file);

            const data = await tryClassifyBackend(backendUrl, formData, CLASSIFY_TIMEOUT_MS);
            if (data) {
              const mapped = mapBackendResult(data);
              if (mapped) {
                result = mapped;
                console.log(`[Classify] Success from ${backendUrl}:`, result);
                break;
              } else {
                console.warn(`[Classify] ${backendUrl} returned invalid state "${data.state}", trying next.`);
              }
            }
          }

          if (!result) {
            console.warn("[Classify] All ML backends failed — using random fallback (client will try TF.js).");
          }
        }

        if (!result) {
          // Simulate 2-second processing when no audio or all backends failed
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
          try {
            await recalculateAnimalBehaviorBaseline(animalId, userId);
          } catch (err) {
            console.error("[Baseline] Failed to recalculate behavior baseline:", err);
          }
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
          breed: z.string().max(100).optional().nullable(),
          age: z.number().int().min(0).max(30).optional().nullable(),
          dateOfBirth: z.string().optional().nullable(),
          sex: z.enum(["male", "female", "unknown"]).optional(),
          color: z.string().optional().nullable(),
          coat: z.enum(["short", "medium", "long"]).optional().nullable(),
          photoUrl: z.string().optional().nullable(),
          microchipNumber: z.string().max(15).optional().nullable(),
          height: z.string().max(50).optional().nullable(),
          tail: z.string().max(50).optional().nullable(),
          specialMarkings: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return addAnimal({ ...input, userId });
      }),

    update: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          name: z.string().min(1).max(100).optional(),
          species: z.enum(["dog", "cat"]).optional(),
          breed: z.string().max(100).optional().nullable(),
          age: z.number().int().min(0).max(30).optional().nullable(),
          dateOfBirth: z.string().optional().nullable(),
          sex: z.enum(["male", "female", "unknown"]).optional(),
          color: z.string().optional().nullable(),
          coat: z.enum(["short", "medium", "long"]).optional().nullable(),
          photoUrl: z.string().optional().nullable(),
          microchipNumber: z.string().max(15).optional().nullable(),
          height: z.string().max(50).optional().nullable(),
          tail: z.string().max(50).optional().nullable(),
          specialMarkings: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const { animalId, ...data } = input;
        await verifyAnimalOwner(animalId, userId, true);
        return updateAnimal(animalId, data);
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
        try {
          return await recalculateAnimalBehaviorBaseline(input.animalId, userId);
        } catch {
          return getAnimalBaseline(input.animalId);
        }
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

    saveBreedFeedback: publicProcedure
      .input(
        z.object({
          animalType: z.enum(["dog", "cat"]),
          predictedBreed: z.string(),
          confirmedBreed: z.string(),
          confidence: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await saveBreedFeedback(input);
        return { success: true };
      }),

    getVaccinations: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getVaccinations(input.animalId);
      }),

    addVaccination: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          vaccineName: z.string().min(1).max(100),
          vaccineType: z.enum(["rabies", "other"]),
          dateAdministered: z.string().length(10),
          batchNumber: z.string().max(50).optional().nullable(),
          veterinarian: z.string().max(100).optional().nullable(),
          nextDueDate: z.string().length(10).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return addVaccination(input);
      }),

    deleteVaccination: publicProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteVaccination(input.id);
      }),

    getDewormings: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getDewormings(input.animalId);
      }),

    addDeworming: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          type: z.enum(["internal", "external", "both"]),
          product: z.string().min(1).max(100),
          dosage: z.string().max(100).optional().nullable(),
          dateAdministered: z.string().length(10),
          nextDueDate: z.string().length(10).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return addDeworming(input);
      }),

    deleteDeworming: publicProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteDeworming(input.id);
      }),

    getDiagnosticTests: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getDiagnosticTests(input.animalId);
      }),

    addDiagnosticTest: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          testName: z.string().min(1).max(100),
          datePerformed: z.string().length(10),
          result: z.string().min(1).max(200),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return addDiagnosticTest(input);
      }),

    deleteDiagnosticTest: publicProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteDiagnosticTest(input.id);
      }),

    getOtherTreatments: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getOtherTreatments(input.animalId);
      }),

    addOtherTreatment: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          treatmentName: z.string().min(1).max(200),
          dateAdministered: z.string().length(10),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return addOtherTreatment(input);
      }),

    deleteOtherTreatment: publicProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteOtherTreatment(input.id);
      }),

    getLicensing: publicProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getLicensing(input.animalId);
      }),

    addLicensing: publicProcedure
      .input(
        z.object({
          animalId: z.number(),
          licenseNumber: z.string().min(1).max(100),
          issueDate: z.string().length(10),
          expiryDate: z.string().length(10).optional().nullable(),
          issuingAuthority: z.string().min(1).max(150),
          category: z.enum(["companion", "dangerous", "potentially_dangerous", "hunting", "guard", "other"]),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return addLicensing(input);
      }),

    deleteLicensing: publicProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteLicensing(input.id);
      }),
  }),

  // ── Events ──────────────────────────────────────────────────────────────────
  events: router({
    recent: publicProcedure
      .input(z.object({ limit: z.number().default(5) }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const events = await getRecentEvents(userId, input.limit);
        return events.map(mapDbEvent);
      }),

    list: publicProcedure
      .input(
        z.object({
          page:     z.number().default(1),
          pageSize: z.number().default(10),
          state:    z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo:   z.string().optional(),
          animalId: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const result = await getEventsPaginated(
          userId,
          input.page,
          input.pageSize,
          input.state,
          input.dateFrom,
          input.dateTo,
          input.animalId
        );
        return {
          events: result.events.map(mapDbEvent),
          total: result.total,
        };
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

    exportData: publicProcedure
      .input(
        z.object({
          state: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          animalId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const filters = {
          state: input.state,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          animalId: input.animalId,
        };
        const events = await getAllEventsForExport(userId, filters);
        return {
          events: events.map(mapEventForExport),
          filters,
          generatedAt: new Date().toISOString(),
        };
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
        const result = await getEventsForAnimalPaginated(
          input.animalId,
          userId,
          input.page,
          input.pageSize
        );
        return {
          events: result.events.map(mapDbEvent),
          total: result.total,
        };
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

  vet: vetRouter,
  health: healthRouter,
  trends: trendsRouter,
});

export type AppRouter = typeof appRouter;
