import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createFamilyGroup,
  createFamilyInviteForUser,
  getDemoUserId,
  getFamilyActivityForUser,
  getFamilyAnimalsForUser,
  getFamilyMembersForUser,
  joinFamilyByInviteCode,
  shareAnimalWithFamily,
} from "../db";

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const familyRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return createFamilyGroup(userId, input.name);
    }),

  join: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(6) }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return joinFamilyByInviteCode(userId, input.code);
    }),

  createInvite: protectedProcedure
    .input(z.object({ familyId: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return createFamilyInviteForUser(userId, input?.familyId);
    }),

  getMembers: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyMembersForUser(userId);
  }),

  shareAnimal: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        familyId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return shareAnimalWithFamily(userId, input.animalId, input.familyId);
    }),

  getAnimals: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyAnimalsForUser(userId);
  }),

  getActivity: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyActivityForUser(userId);
  }),
});
