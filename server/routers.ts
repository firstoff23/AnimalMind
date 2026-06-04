import { TRPCError } from "@trpc/server";
import { streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { notifyN8N } from "./_core/notification";
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
  getSignedAudioUrl,
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
import { checkRateLimit } from "./_core/rateLimiter";
import { STATE_LABELS, type EmotionalState, type ModelUsed } from "../shared/types";

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

// Default ML backends. Runtime env can prepend a deployed backend without
// removing these known-good fallbacks.
const PRIMARY_BACKEND_URL = "https://animalmind-backend.fly.dev";
const HF_BACKEND_URL = "https://firstoff-animalmind-backend.hf.space";
const CLASSIFY_TIMEOUT_MS = 5000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** General POST helper for ML backends. */
async function tryBackendPost(
  url: string,
  endpoint: string,
  formData: FormData,
  timeoutMs: number
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}${endpoint}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.warn(`[ML] Backend ${url}${endpoint} failed${isTimeout ? " (timeout)" : ""}: ${err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Attempt to classify audio against a single backend URL, with timeout. */
async function tryClassifyBackend(
  url: string,
  formData: FormData,
  timeoutMs: number
): Promise<{ state: string; confidence: number; emoji: string; model_used: string } | null> {
  return tryBackendPost(url, "/classify", formData, timeoutMs);
}

function resolveMlBackendUrls() {
  const candidates = [
    process.env.FASTAPI_BACKEND_URL,
    process.env.VITE_API_URL,
    PRIMARY_BACKEND_URL,
    process.env.HF_BACKEND_URL,
    HF_BACKEND_URL,
  ];

  const seen = new Set<string>();
  const normalized = candidates
    .filter((url): url is string => Boolean(url?.trim()))
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });

  // Group into fast and slow candidates (deprioritize hf.space URLs to the end to prevent Vercel timeouts)
  const fast = normalized.filter((url) => !url.includes("hf.space"));
  const slow = normalized.filter((url) => url.includes("hf.space"));

  return [...fast, ...slow];
}

/** Attempt to run vision detections against primary/fallback ML backend. */
async function tryVisionBackend(
  endpoint: string,
  imageBuffer: Buffer,
  timeoutMs: number
): Promise<any> {
  for (const backendUrl of resolveMlBackendUrls()) {
    const file = new File([Uint8Array.from(imageBuffer)], "frame.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    
    const data = await tryBackendPost(backendUrl, endpoint, formData, timeoutMs);
    if (data) return data;
  }
  return null;
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

const MINDI_DEFAULT_MODEL = "google/gemini-3.5-flash";
const MINDI_BASE_PROMPT =
  "És a Mindi, assistente de bem-estar animal do AnimalMind. Tens acesso ao perfil do animal [nome, espécie, raça] e ao histórico de classificações recentes. Responde sempre em português de Portugal. Sê precisa, empática e recomenda sempre consulta veterinária para situações de saúde sérias. Nunca substituas um diagnóstico médico.";

const SPECIES_LABELS: Record<string, string> = {
  dog: "cão",
  cat: "gato",
};

function formatAnimalContext(animal: any | null) {
  if (!animal) {
    return "Nenhum animal selecionado.";
  }

  return [
    `Nome: ${animal.name ?? "Sem nome"}`,
    `Espécie: ${SPECIES_LABELS[animal.species] ?? animal.species ?? "desconhecida"}`,
    `Raça: ${animal.breed || "indefinida/desconhecida"}`,
    `Idade: ${typeof animal.age === "number" ? `${animal.age} anos` : "desconhecida"}`,
  ].join("\n");
}

function formatRecentClassifications(events: ReturnType<typeof mapDbEvent>[]) {
  if (events.length === 0) {
    return "Sem classificações recentes registadas para este animal.";
  }

  return events
    .slice(0, 5)
    .map((event, index) => {
      const state = event.state as EmotionalState;
      const stateLabel = STATE_LABELS[state] ?? event.state;
      const confidence = Number.isFinite(event.confidence)
        ? `${Math.round(event.confidence * 100)}%`
        : "sem confiança";
      return `${index + 1}. ${stateLabel} (${confidence}) em ${event.createdAt.toISOString()}`;
    })
    .join("\n");
}

function buildMindiSystemPrompt(
  animal: any | null,
  events: ReturnType<typeof mapDbEvent>[]
) {
  return `${MINDI_BASE_PROMPT}

Contexto automático do AnimalMind:
${formatAnimalContext(animal)}

Últimas 5 classificações do histórico:
${formatRecentClassifications(events)}

Regras de resposta:
- Mantém as respostas práticas, curtas e acionáveis.
- Se houver sinais de dor, apatia, dificuldade respiratória, vómitos persistentes, convulsões, trauma, intoxicação ou recusa prolongada de alimento/água, recomenda consulta veterinária com urgência.
- Não inventes medições, diagnósticos ou tratamentos que não estejam no contexto.`;
}

function buildFallbackMindiResponse(
  message: string,
  animal: any | null,
  events: ReturnType<typeof mapDbEvent>[]
) {
  const animalName = animal?.name ? animal.name : "o teu animal";
  const recent = events[0];
  const recentState = recent
    ? ` A última classificação registada foi ${STATE_LABELS[recent.state as EmotionalState] ?? recent.state}.`
    : "";
  const normalized = message.toLocaleLowerCase("pt-PT");

  if (normalized.includes("não come") || normalized.includes("nao come") || normalized.includes("comer")) {
    return `${animalName} pode estar a recusar comida por stress, alteração de rotina, desconforto oral, náusea ou dor.${recentState} Observa também água, energia, vómitos, diarreia e sinais de dor. Se não comer durante 24 horas, se for gato, sénior, cachorro, ou se houver apatia/vómitos/dificuldade respiratória, contacta um médico veterinário.`;
  }

  if (normalized.includes("stress") || normalized.includes("ansiedade")) {
    return `Para sinais de stress em ${animalName}, procura vocalizações fora do habitual, respiração rápida, esconder-se, lamber-se em excesso, postura tensa, agressividade súbita ou perda de apetite.${recentState} Reduz estímulos, mantém uma rotina previsível e cria uma zona calma. Se os sinais forem intensos ou persistentes, marca avaliação veterinária.`;
  }

  if (normalized.includes("aliment")) {
    return `Para alimentação, mantém horários consistentes, água sempre disponível e mudanças graduais de ração ao longo de 7 a 10 dias. Ajusta a dose à idade, peso, espécie e nível de atividade de ${animalName}. Se houver perda de peso, vómitos, diarreia ou recusa alimentar, confirma com o veterinário.`;
  }

  if (normalized.includes("veterin")) {
    return `Deves ir ao veterinário se ${animalName} tiver dificuldade em respirar, convulsões, trauma, intoxicação, dor evidente, apatia marcada, vómitos persistentes, diarreia com sangue, desidratação, ou recusa de comida/água prolongada.${recentState} Em situações graves, não esperes por nova classificação da app.`;
  }

  return `Com base no perfil de ${animalName} e no histórico recente, posso ajudar-te a interpretar sinais de comportamento, alimentação e bem-estar.${recentState} Diz-me o que observaste, há quanto tempo acontece e se existem sinais físicos como dor, vómitos, diarreia, apatia ou dificuldade respiratória. Para sintomas sérios, a avaliação veterinária é indispensável.`;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  family: familyRouter,

  chat: router({
    send: protectedProcedure
      .input(
        z.object({
          animalId: z.number().optional(),
          message: z.string().min(1).max(1200),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().min(1).max(4000),
              })
            )
            .max(10)
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "chat.send", 25);
        const userId = await effectiveUserId(ctx.user);
        const animal = input.animalId
          ? await getAnimalById(input.animalId, userId)
          : await getActiveAnimal(userId);

        if (input.animalId && !animal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Animal não encontrado ou sem acesso para este utilizador.",
          });
        }

        const recentResult = animal
          ? await getEventsForAnimalPaginated(animal.id, userId, 1, 5)
          : { events: await getRecentEvents(userId, 5), total: 0 };
        const recentEvents = recentResult.events.map(mapDbEvent);
        const system = buildMindiSystemPrompt(animal, recentEvents);
        const model = process.env.MINDI_AI_MODEL || MINDI_DEFAULT_MODEL;
        const messages: ModelMessage[] = [
          ...(input.history ?? []).map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: "user", content: input.message },
        ];

        try {
          const result = streamText({
            model,
            system,
            messages,
          });
          const reply = (await result.text).trim();
          return {
            reply: reply || buildFallbackMindiResponse(input.message, animal, recentEvents),
            model,
            fallback: !reply,
          };
        } catch (err) {
          console.warn("[Mindi] AI generation failed, returning fallback response:", err);
          return {
            reply: buildFallbackMindiResponse(input.message, animal, recentEvents),
            model,
            fallback: true,
          };
        }
      }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
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
    run: protectedProcedure
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
        checkRateLimit(ctx, "classify.run", 30);
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

        // ── Backend fallback chain ───────────────────────────────────────────
        // Tier 1: runtime FASTAPI_BACKEND_URL/VITE_API_URL when configured
        // Tier 2+: known Fly.dev and HF Space fallbacks
        // Final: client-side TF.js fallback if every server backend fails
        if (buffer) {
          for (const backendUrl of resolveMlBackendUrls()) {
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
            console.warn("[Classify] All ML backends failed.");
          }
        }

        if (!result) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Não foi possível classificar o áudio neste momento. O áudio foi guardado para análise posterior.",
          });
        }

        const userId = await effectiveUserId(ctx.user);
        const targetAnimalId = input.animalId || 1;
        await verifyAnimalOwner(targetAnimalId, userId, true);
        const targetAnimal = await getAnimalById(targetAnimalId, userId);

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
        const eventTimestamp =
          (event as any)?.created_at ??
          (event as any)?.createdAt ??
          new Date().toISOString();

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

          try {
            await notifyN8N({
              userId,
              animalId: targetAnimalId,
              animalName: targetAnimal?.name ?? "Animal",
              emotionalState: result.state,
              confidence: result.confidence,
              timestamp: new Date(eventTimestamp).toISOString(),
            });
          } catch (err) {
            console.error("[n8n] Failed to send classification webhook:", err);
          }
        }

        return { ...result, eventId, audioUrl, beliefState, posture: input.posture || null };
      }),

    detectPosture: protectedProcedure
      .input(
        z.object({
          image: z.string(), // base64 JPEG
        })
      )
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "classify.detectPosture", 45);
        const buffer = Buffer.from(input.image, "base64");
        const data = await tryVisionBackend("/detect-posture", buffer, CLASSIFY_TIMEOUT_MS);
        if (!data) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Detecção de postura indisponível no momento.",
          });
        }
        return data as { posture: string; confidence: number };
      }),

    detectSpecies: protectedProcedure
      .input(
        z.object({
          image: z.string(), // base64 JPEG
        })
      )
      .mutation(async ({ ctx, input }) => {
        checkRateLimit(ctx, "classify.detectSpecies", 45);
        const buffer = Buffer.from(input.image, "base64");
        const data = await tryVisionBackend("/detect-species", buffer, CLASSIFY_TIMEOUT_MS);
        if (!data) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Detecção de espécie indisponível no momento.",
          });
        }
        return data as { species: string; confidence: number };
      }),
  }),

  // ── Animals ─────────────────────────────────────────────────────────────────
  animals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getAnimalsByUser(userId);
    }),

    add: protectedProcedure
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

    update: protectedProcedure
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

    setActive: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await setActiveAnimal(input.animalId, userId);
        return { success: true };
      }),

    getActive: protectedProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getActiveAnimal(userId);
    }),

    weeklyStats: protectedProcedure
      .input(z.object({ animalId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        return getWeeklyStats(userId, input.animalId);
      }),

    get: protectedProcedure
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

    getBaseline: protectedProcedure
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

    updateBaseline: protectedProcedure
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

    getBeliefState: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getLatestBeliefState(input.animalId);
      }),

    inviteShare: protectedProcedure
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

    listShares: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getAnimalShares(input.animalId);
      }),

    removeShare: protectedProcedure
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

    getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      return getPendingInvitations(userId);
    }),

    respondToInvitation: protectedProcedure
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

    saveBreedFeedback: protectedProcedure
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

    getVaccinations: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getVaccinations(input.animalId);
      }),

    addVaccination: protectedProcedure
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

    deleteVaccination: protectedProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteVaccination(input.id);
      }),

    getDewormings: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getDewormings(input.animalId);
      }),

    addDeworming: protectedProcedure
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

    deleteDeworming: protectedProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteDeworming(input.id);
      }),

    getDiagnosticTests: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getDiagnosticTests(input.animalId);
      }),

    addDiagnosticTest: protectedProcedure
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

    deleteDiagnosticTest: protectedProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteDiagnosticTest(input.id);
      }),

    getOtherTreatments: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getOtherTreatments(input.animalId);
      }),

    addOtherTreatment: protectedProcedure
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

    deleteOtherTreatment: protectedProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteOtherTreatment(input.id);
      }),

    getLicensing: protectedProcedure
      .input(z.object({ animalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId);
        return getLicensing(input.animalId);
      }),

    addLicensing: protectedProcedure
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

    deleteLicensing: protectedProcedure
      .input(z.object({ id: z.number(), animalId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        await verifyAnimalOwner(input.animalId, userId, true);
        return deleteLicensing(input.id);
      }),
  }),

  // ── Events ──────────────────────────────────────────────────────────────────
  events: router({
    recent: protectedProcedure
      .input(z.object({ limit: z.number().default(5) }))
      .query(async ({ ctx, input }) => {
        const userId = await effectiveUserId(ctx.user);
        const events = await getRecentEvents(userId, input.limit);
        const mapped = events.map(mapDbEvent);
        return Promise.all(
          mapped.map(async (e) => ({
            ...e,
            audioUrl: await getSignedAudioUrl(e.audioUrl),
          }))
        );
      }),

    list: protectedProcedure
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
        const mappedEvents = await Promise.all(
          result.events.map(mapDbEvent).map(async (e) => ({
            ...e,
            audioUrl: await getSignedAudioUrl(e.audioUrl),
          }))
        );
        return {
          events: mappedEvents,
          total: result.total,
        };
      }),

    feedback: protectedProcedure
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

    exportData: protectedProcedure
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
        const mappedEvents = await Promise.all(
          events.map(mapEventForExport).map(async (e) => ({
            ...e,
            audioUrl: await getSignedAudioUrl(e.audioUrl),
          }))
        );
        return {
          events: mappedEvents,
          filters,
          generatedAt: new Date().toISOString(),
        };
      }),

    exportCsv: protectedProcedure.query(async ({ ctx }) => {
      const userId = await effectiveUserId(ctx.user);
      const events = await getAllEventsForExport(userId);
      const header = "id,state,confidence,emoji,model_used,cached,feedback,audio_url,created_at";
      const rows = await Promise.all(
        events.map(async (e: any) => {
          const signedUrl = await getSignedAudioUrl(e.audio_url);
          return [
            e.id,
            e.state,
            e.confidence,
            e.emoji,
            e.model_used,
            e.cached,
            e.feedback ?? "",
            signedUrl ?? "",
            new Date(e.created_at).toISOString(),
          ].join(",");
        })
      );
      return { csv: [header, ...rows].join("\n") };
    }),

    getNotes: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return getEventNotes(input.eventId);
      }),

    updateNotes: protectedProcedure
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

    listForAnimal: protectedProcedure
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
        const mappedEvents = await Promise.all(
          result.events.map(mapDbEvent).map(async (e) => ({
            ...e,
            audioUrl: await getSignedAudioUrl(e.audioUrl),
          }))
        );
        return {
          events: mappedEvents,
          total: result.total,
        };
      }),

    statsForAnimal: protectedProcedure
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

    getVisualMetadata: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const posture = await getEventPosture(input.eventId);
        const beliefState = await getEventBeliefState(input.eventId);
        return { posture, beliefState };
      }),
  }),

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
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

    update: protectedProcedure
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
