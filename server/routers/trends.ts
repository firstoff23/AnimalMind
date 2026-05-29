import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getTrendsEvents,
  getAnimalById,
  verifyAnimalOwner,
  getDemoUserId,
} from "../db";
import type { EmotionalState } from "../../shared/types";

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

const SCORE_MAP: Record<EmotionalState, number> = {
  excitement: 90,
  relaxed: 75,
  attention: 50,
  hunger: 50,
  alert: 30,
  distress: 15,
};

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const trendsRouter = router({
  getWeeklyTrend: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);

      const animal = await getAnimalById(input.animalId, userId);
      if (!animal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Animal não encontrado" });
      }

      const events = await getTrendsEvents(input.animalId, 14);

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const last7DaysEvents = events.filter((e) => new Date(e.created_at) >= sevenDaysAgo);
      const prev7DaysEvents = events.filter((e) => new Date(e.created_at) < sevenDaysAgo);

      const calcAverage = (evs: typeof events) => {
        if (evs.length === 0) return 0;
        const sum = evs.reduce((acc, e) => acc + (SCORE_MAP[e.state as EmotionalState] ?? 50), 0);
        return sum / evs.length;
      };

      const last7Avg = calcAverage(last7DaysEvents);
      const prev7Avg = calcAverage(prev7DaysEvents);

      let percentageChange = 0;
      let trend: "up" | "down" | "stable" = "stable";

      if (prev7Avg > 0) {
        percentageChange = ((last7Avg - prev7Avg) / prev7Avg) * 100;
        if (percentageChange >= 5) trend = "up";
        else if (percentageChange <= -5) trend = "down";
      } else if (last7Avg > 0) {
        percentageChange = 100;
        trend = "up";
      }

      // Group last 7 days by calendar date
      const dailyScoresMap: Record<string, { sum: number; count: number }> = {};
      
      // Initialize last 7 days to ensure we have entries (even if score is neutral/relaxed or empty)
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
        dailyScoresMap[dateStr] = { sum: 0, count: 0 };
      }

      last7DaysEvents.forEach((e) => {
        const dateStr = new Date(e.created_at).toISOString().split("T")[0];
        if (dailyScoresMap[dateStr]) {
          dailyScoresMap[dateStr].sum += SCORE_MAP[e.state as EmotionalState] ?? 50;
          dailyScoresMap[dateStr].count += 1;
        }
      });

      const dailyScores = Object.entries(dailyScoresMap).map(([date, val]) => {
        const parts = date.split("-");
        const formattedDate = `${parts[2]}/${parts[1]}`; // DD/MM
        return {
          date: formattedDate,
          score: val.count > 0 ? Math.round(val.sum / val.count) : 75, // default to relaxed/stable if no events
        };
      });

      // Find dominant emotion in the last 7 days
      const emotionCounts: Record<string, number> = {};
      last7DaysEvents.forEach((e) => {
        emotionCounts[e.state] = (emotionCounts[e.state] ?? 0) + 1;
      });

      let dominantEmotion: EmotionalState | null = null;
      let maxCount = 0;
      Object.entries(emotionCounts).forEach(([state, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = state as EmotionalState;
        }
      });

      // Generate messages
      let message = "";
      if (last7DaysEvents.length === 0) {
        message = "Sem dados suficientes nos últimos 7 dias.";
      } else {
        const emotionName = dominantEmotion ? dominantEmotion : "estável";
        if (trend === "up") {
          message = `O bem-estar do ${animal.name} melhorou em ${Math.round(Math.abs(percentageChange))}% esta semana.`;
        } else if (trend === "down") {
          message = `O bem-estar do ${animal.name} diminuiu em ${Math.round(Math.abs(percentageChange))}% esta semana. Preste mais atenção.`;
        } else {
          message = `O bem-estar do ${animal.name} mantém-se estável esta semana.`;
        }
      }

      return {
        trend,
        percentageChange: Math.round(percentageChange),
        dailyScores,
        dominantEmotion,
        message,
      };
    }),

  getPatterns: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);

      const animal = await getAnimalById(input.animalId, userId);
      if (!animal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Animal não encontrado" });
      }

      const events = await getTrendsEvents(input.animalId, 30);

      if (events.length < 5) {
        return {
          worstDayOfWeek: null,
          bestDayOfWeek: null,
          patterns: ["Dados insuficientes para analisar padrões. Continue a fazer gravações nos próximos dias."],
        };
      }

      // Group by day of week
      const weekdayScores: Record<number, { sum: number; count: number }> = {};
      for (let i = 0; i < 7; i++) {
        weekdayScores[i] = { sum: 0, count: 0 };
      }

      events.forEach((e) => {
        const day = new Date(e.created_at).getDay(); // 0 = Sunday, 1 = Monday, etc.
        weekdayScores[day].sum += SCORE_MAP[e.state as EmotionalState] ?? 50;
        weekdayScores[day].count += 1;
      });

      let bestDayOfWeek = 0;
      let worstDayOfWeek = 0;
      let maxScore = -1;
      let minScore = 999;
      let hasValidDays = false;

      Object.entries(weekdayScores).forEach(([day, data]) => {
        if (data.count > 0) {
          hasValidDays = true;
          const avg = data.sum / data.count;
          if (avg > maxScore) {
            maxScore = avg;
            bestDayOfWeek = parseInt(day, 10);
          }
          if (avg < minScore) {
            minScore = avg;
            worstDayOfWeek = parseInt(day, 10);
          }
        }
      });

      const patterns: string[] = [];
      if (hasValidDays) {
        const bestDayName = DAY_NAMES[bestDayOfWeek];
        const worstDayName = DAY_NAMES[worstDayOfWeek];

        patterns.push(`O dia com melhor bem-estar médio é a ${bestDayName.toLowerCase()}.`);
        
        if (bestDayOfWeek === 0 || bestDayOfWeek === 6) {
          patterns.push(`O ${animal.name} costuma estar mais calmo e relaxado aos fins de semana.`);
        }

        if (minScore < 50) {
          patterns.push(`Níveis mais elevados de agitação/ansiedade registados à ${worstDayName.toLowerCase()}.`);
        }

        // Check if there are distress vocalizations
        const distressEvents = events.filter((e) => e.state === "distress");
        if (distressEvents.length >= 3) {
          patterns.push(`Detetados ${distressEvents.length} eventos de angústia. Considere rever o ambiente físico.`);
        }
      }

      return {
        worstDayOfWeek,
        bestDayOfWeek,
        patterns,
      };
    }),
});
