import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addVetNote,
  getDemoUserId,
  getSupabase,
  getVetDashboardData,
  getVetPetDetail,
  getVetReportData,
  getVetSharedAnimals,
  linkPetWithVet,
  saveVetClinicalNotes,
  setVetCaseStatus,
  shareReportWithVet,
  type VetCaseStatus,
  verifyAnimalOwner,
} from "../db";
import { sendPushNotification } from "../_core/pushNotification";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

function requireVetRole(ctxUser: { role?: string | null } | null) {
  if (
    !ctxUser ||
    !["vet", "veterinarian", "clinic_admin", "admin"].includes(
      String(ctxUser.role),
    )
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a utilizadores com role veterinária.",
    });
  }
}

const animalFiltersSchema = z
  .object({
    species: z.string().optional(),
    state: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .optional();

const caseStatusSchema = z.enum(["stable", "monitor", "requires_attention"]);

export const vetRouter = router({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    requireVetRole(ctx.user);
    const vetUserId = await effectiveUserId(ctx.user);
    return getVetDashboardData(vetUserId, ctx.user?.email ?? null);
  }),

  listSharedPets: protectedProcedure
    .input(animalFiltersSchema)
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetSharedAnimals(
        vetUserId,
        ctx.user?.email ?? null,
        input ?? {},
      );
    }),

  getPetDetail: protectedProcedure
    .input(
      z.object({
        animalId: z.number().int().positive(),
        days: z.number().int().min(7).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetPetDetail(
        vetUserId,
        ctx.user?.email ?? null,
        input.animalId,
        input.days,
      );
    }),

  addNote: protectedProcedure
    .input(
      z.object({
        animalId: z.number().int().positive(),
        note: z.string().trim().min(2).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      const noteResult = await addVetNote(vetUserId, input.animalId, input.note);

      // Enviar notificação push ao tutor do animal
      try {
        const supabase = getSupabase();
        const { data: animal } = await supabase
          .from("animals")
          .select("user_id, name")
          .eq("id", input.animalId)
          .single();

        if (animal?.user_id) {
          const ownerId = Number(animal.user_id);
          const animalName = animal.name || "animal";
          await sendPushNotification(ownerId, {
            title: "Nova Nota Clínica do Veterinário",
            body: `O veterinário adicionou uma nova nota clínica para ${animalName}!`,
            data: { url: "/perfil", animalId: input.animalId },
          });
        }
      } catch (err) {
        console.error("[Push] Falha ao enviar notificação push de nota do veterinário:", err);
      }

      return noteResult;
    }),

  setCaseStatus: protectedProcedure
    .input(
      z.object({
        animalId: z.number().int().positive(),
        status: caseStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return setVetCaseStatus(
        vetUserId,
        ctx.user?.email ?? null,
        input.animalId,
        input.status as VetCaseStatus,
      );
    }),

  linkPet: protectedProcedure
    .input(
      z
        .object({
          animalId: z.number().int().positive(),
          vetEmail: z.string().trim().email().optional(),
          vetCode: z.string().trim().min(3).max(32).optional(),
          vetName: z.string().trim().min(1).max(160).optional(),
          note: z.string().trim().max(1000).optional(),
        })
        .refine((value) => value.vetEmail || value.vetCode, {
          message: "Indique o email ou código do veterinário.",
          path: ["vetEmail"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return linkPetWithVet(userId, input.animalId, {
        email: input.vetEmail,
        vetCode: input.vetCode,
        name: input.vetName,
        note: input.note,
      });
    }),

  getAnimals: protectedProcedure
    .input(animalFiltersSchema)
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetSharedAnimals(
        vetUserId,
        ctx.user?.email ?? null,
        input ?? {},
      );
    }),

  getReport: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        days: z.number().int().min(30).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      return getVetReportData(
        vetUserId,
        ctx.user?.email ?? null,
        input.animalId,
        input.days,
      );
    }),

  saveNotes: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        notes: z.string().max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireVetRole(ctx.user);
      const vetUserId = await effectiveUserId(ctx.user);
      const notes = await saveVetClinicalNotes(
        vetUserId,
        input.animalId,
        input.notes,
      );
      return { success: true, notes };
    }),

  shareReport: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        note: z.string().optional().default(""),
      }),
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
