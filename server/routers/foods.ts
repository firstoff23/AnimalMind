import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getFoods, getFoodById, searchFoods } from "../db";

export const foodsRouter = router({
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        species: z.string(),
      })
    )
    .query(async ({ input }) => {
      return searchFoods(input.query, input.species);
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        species: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getFoodById(input.id, input.species);
    }),

  getAll: publicProcedure
    .input(
      z.object({
        species: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getFoods(input?.species);
    }),
});
