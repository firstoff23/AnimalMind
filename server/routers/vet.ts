import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getDemoUserId,
  getVetReportData,
  getVetSharedAnimals,
  saveVetClinicalNotes,
  shareReportWithVet,
  verifyAnimalOwner,
} from "../db";

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

function requireVetRole(ctxUser: { role?: string | null } | null) {
  if (!ctxUser || !["vet", "admin"].includes(String(ctxUser.role))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a utilizadores com role vet.",
    });
  }
}

export const vetRouter = router({
  getAnimals: protectedProcedure
    .input(
      z
        .object({
          species: z.string().optional(),
          state: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetSharedAnimals(vetUserId, ctx.user?.email ?? null, input ?? {});
    }),

  getReport: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        days: z.number().int().min(30).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetReportData(vetUserId, ctx.user?.email ?? null, input.animalId, input.days);
    }),

  saveNotes: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        notes: z.string().max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      const notes = await saveVetClinicalNotes(vetUserId, input.animalId, input.notes);
      return { success: true, notes };
    }),

  shareReport: protectedProcedure
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
        ownerId: userId,
      });
      return { success: true };
    }),
});
