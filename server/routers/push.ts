import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../db";

export const pushRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = getSupabase();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
        {
          onConflict: "endpoint",
        },
      );

      if (error) {
        throw error;
      }

      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = getSupabase();

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", input.endpoint)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    }),
});
