import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sanitizedString } from "../_core/sanitize";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addHealthRecord,
  addVaccine,
  deleteHealthRecord,
  deleteVaccine,
  getDemoUserId,
  getHealthRecordById,
  getHealthRecords,
  getVaccineById,
  getVaccines,
  verifyAnimalOwner,
} from "../db";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const healthRouter = router({
  getVaccines: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getVaccines(input.animalId);
    }),

  addVaccine: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        vaccineName: sanitizedString(100),
        vaccineType: z.enum(["rabies", "other"]),
        dateAdministered: z.string().min(1),
        batchNumber: sanitizedString(50).nullable().optional(),
        veterinarian: sanitizedString(100).nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addVaccine(input);
    }),

  deleteVaccine: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const vaccine = await getVaccineById(input.id);
      if (!vaccine) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vacina não encontrada",
        });
      }
      await verifyAnimalOwner(vaccine.animalId, userId, true);
      return deleteVaccine(input.id);
    }),

  getHealthRecords: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getHealthRecords(input.animalId);
    }),

  addHealthRecord: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        recordType: z.enum([
          "deworming",
          "diagnostic_test",
          "other_treatment",
          "licensing",
          "notes",
        ]),
        date: z.string().min(1),
        product: sanitizedString(100).nullable().optional(),
        dosage: sanitizedString(100).nullable().optional(),
        result: sanitizedString(200).nullable().optional(),
        category: sanitizedString(100).nullable().optional(),
        notes: sanitizedString(500).nullable().optional(),
        licenseNumber: sanitizedString(100).nullable().optional(),
        issuingAuthority: sanitizedString(150).nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addHealthRecord(input);
    }),

  deleteHealthRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const record = await getHealthRecordById(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registo de saúde não encontrado",
        });
      }
      await verifyAnimalOwner(record.animalId, userId, true);
      return deleteHealthRecord(input.id);
    }),
});
