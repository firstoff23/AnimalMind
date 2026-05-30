import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getVaccines,
  addVaccine,
  deleteVaccine,
  getHealthRecords,
  addHealthRecord,
  deleteHealthRecord,
} from "../db";

export const healthRouter = router({
  getVaccines: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ input }) => {
      return getVaccines(input.animalId);
    }),

  addVaccine: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        vaccineName: z.string().min(1).max(100),
        vaccineType: z.enum(["rabies", "other"]),
        dateAdministered: z.string().min(1),
        batchNumber: z.string().nullable().optional(),
        veterinarian: z.string().nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return addVaccine(input);
    }),

  deleteVaccine: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteVaccine(input.id);
    }),

  getHealthRecords: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ input }) => {
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
        product: z.string().nullable().optional(),
        dosage: z.string().nullable().optional(),
        result: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        licenseNumber: z.string().nullable().optional(),
        issuingAuthority: z.string().nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return addHealthRecord(input);
    }),

  deleteHealthRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteHealthRecord(input.id);
    }),
});
