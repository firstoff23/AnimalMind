// server/routers/insights.ts
//
// Usa @supabase/supabase-js com Query Builder, no mesmo padrão de
// getStatsForAnimal: um único .select() por fonte de dados, agregação
// feita em JavaScript. Não usei RPC — o volume de dados por animal é
// gerível em JS, tal como já fazes em getStatsForAnimal. Se um dia isto
// ficar lento (milhares de eventos por animal), dá para migrar para uma
// função RPC agregada no Postgres sem mudar a interface do router tRPC
// (o `forAnimal` continua a devolver a mesma forma de dados).

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDemoUserId, getSupabase } from "../db";

const PERIOD_TAGS = ["manha", "tarde", "noite"] as const;
type PeriodTag = (typeof PERIOD_TAGS)[number];
const MIN_EVENTS_FOR_INSIGHT = 3;

// Janela de dados: últimos 2000 eventos (ou ~1 ano, o que vier primeiro
// via limit) é mais do que suficiente para um animal e evita puxar um
// histórico gigante para memória. Ajusta se achares pouco.
const EVENTS_FETCH_LIMIT = 2000;

interface InsightEvent {
  id: number;
  state: string;
  feedback: string | null;
  context_tags: string[] | null;
  created_at: string;
}

// ─── effectiveUserId (mesmo padrão de trends.ts / vet.ts) ────────────────────

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

// ─── Fetch único de eventos (partilhado pelos 4 insights) ─────────────────────

async function fetchEventsForInsights(
  animalId: number,
  userId: number,
): Promise<InsightEvent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("classification_events")
    .select("id, state, feedback, context_tags, created_at")
    .eq("animal_id", animalId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(EVENTS_FETCH_LIMIT);
  if (error) throw error;
  return data ?? [];
}

// feedback_annotations não guarda "correct/incorrect" — guarda se houve
// correção detalhada. Um evento "tem feedback" se tiver `feedback` rápido
// OU uma entrada em feedback_annotations.
async function fetchAnnotatedEventIds(eventIds: number[]): Promise<Set<number>> {
  if (eventIds.length === 0) return new Set();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("feedback_annotations")
    .select("classification_event_id")
    .in("classification_event_id", eventIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.classification_event_id as number));
}

// ─── 1. Taxa de feedback ──────────────────────────────────────────────────────

function computeFeedbackRate(events: InsightEvent[], annotatedIds: Set<number>) {
  const totalEvents = events.length;
  if (totalEvents === 0) return null;
  const eventsWithFeedback = events.filter(
    (e) => e.feedback !== null || annotatedIds.has(e.id),
  ).length;
  return {
    totalEvents,
    eventsWithFeedback,
    rate: eventsWithFeedback / totalEvents,
  };
}

// ─── 2. Padrão por período do dia ─────────────────────────────────────────────

interface PeriodBucket {
  dominantState: string | null;
  total: number;
  counts: Record<string, number>;
}

function computePeriodOfDay(events: InsightEvent[]): Record<PeriodTag, PeriodBucket> {
  const byPeriod: Record<PeriodTag, PeriodBucket> = {
    manha: { dominantState: null, total: 0, counts: {} },
    tarde: { dominantState: null, total: 0, counts: {} },
    noite: { dominantState: null, total: 0, counts: {} },
  };

  for (const event of events) {
    const tags = event.context_tags ?? [];
    for (const period of PERIOD_TAGS) {
      if (!tags.includes(period)) continue;
      const bucket = byPeriod[period];
      bucket.counts[event.state] = (bucket.counts[event.state] ?? 0) + 1;
      bucket.total += 1;
    }
  }

  for (const period of PERIOD_TAGS) {
    const bucket = byPeriod[period];
    if (bucket.total < MIN_EVENTS_FOR_INSIGHT) continue;
    const [dominant] = Object.entries(bucket.counts).sort((a, b) => b[1] - a[1]);
    bucket.dominantState = dominant?.[0] ?? null;
  }

  return byPeriod;
}

// ─── 3. Contexto mais associado a cada estado ─────────────────────────────────

function computeTopContextByState(events: InsightEvent[]) {
  const stateTagCounts: Record<string, Record<string, number>> = {};
  const stateTotals: Record<string, number> = {};

  for (const event of events) {
    const tags = (event.context_tags ?? []).filter(
      (tag) => !PERIOD_TAGS.includes(tag as PeriodTag),
    );
    for (const tag of tags) {
      stateTagCounts[event.state] ??= {};
      stateTagCounts[event.state][tag] = (stateTagCounts[event.state][tag] ?? 0) + 1;
      stateTotals[event.state] = (stateTotals[event.state] ?? 0) + 1;
    }
  }

  const top: Array<{ state: string; tag: string; occurrences: number; totalForState: number }> = [];
  for (const [state, tagCounts] of Object.entries(stateTagCounts)) {
    const totalForState = stateTotals[state] ?? 0;
    if (totalForState < MIN_EVENTS_FOR_INSIGHT) continue;
    const [topTag] = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (!topTag) continue;
    top.push({ state, tag: topTag[0], occurrences: topTag[1], totalForState });
  }
  return top;
}

// ─── 4. Tendência temporal por estado ────────────────────────────────────────

function computeStateTrend(events: InsightEvent[]) {
  const now = Date.now();
  const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
  const EIGHT_WEEKS_MS = 8 * 7 * 24 * 60 * 60 * 1000;

  const recent: Record<string, number> = {};
  const previous: Record<string, number> = {};

  for (const event of events) {
    const age = now - new Date(event.created_at).getTime();
    if (age > EIGHT_WEEKS_MS) continue; // fora da janela de comparação
    const bucket = age <= FOUR_WEEKS_MS ? recent : previous;
    bucket[event.state] = (bucket[event.state] ?? 0) + 1;
  }

  const states = new Set([...Object.keys(recent), ...Object.keys(previous)]);

  return Array.from(states)
    .map((state) => {
      const recentCount = recent[state] ?? 0;
      const previousCount = previous[state] ?? 0;
      const total = recentCount + previousCount;
      if (total < MIN_EVENTS_FOR_INSIGHT * 2 || previousCount === 0) {
        return { state, recentCount, previousCount, changePercent: null as number | null };
      }
      const changePercent = Math.round(((recentCount - previousCount) / previousCount) * 100);
      return { state, recentCount, previousCount, changePercent };
    })
    .filter((row) => row.changePercent !== null)
    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!));
}

// ─── 5. Concordância modelo-tutor ────────────────────────────────────────────

function computeModelAgreement(events: InsightEvent[]) {
  const agreeCount = events.filter((e) => e.feedback === "correct").length;
  const disagreeCount = events.filter((e) => e.feedback === "incorrect").length;
  const total = agreeCount + disagreeCount;
  if (total < MIN_EVENTS_FOR_INSIGHT) return null;
  return { agreeCount, disagreeCount, total, rate: agreeCount / total };
}

// ─── Orquestração ──────────────────────────────────────────────────────────────
// Um único fetch de classification_events (partilhado pelos 4 insights)
// + um fetch de feedback_annotations. Só 2 pedidos ao Supabase no total,
// tal como getStatsForAnimal faz 1.

export async function getInsightsForAnimal(animalId: number, userId: number) {
  const events = await fetchEventsForInsights(animalId, userId);
  const annotatedIds = await fetchAnnotatedEventIds(events.map((e) => e.id));

  return {
    feedbackRate: computeFeedbackRate(events, annotatedIds),
    periodOfDay: computePeriodOfDay(events),
    topContextByState: computeTopContextByState(events),
    trend: computeStateTrend(events),
    modelAgreement: computeModelAgreement(events),
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const insightsRouter = router({
  forAnimal: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getInsightsForAnimal(input.animalId, userId);
    }),
});
