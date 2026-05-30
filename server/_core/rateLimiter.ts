import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Checks if the request rate limit has been exceeded for a given user or IP.
 * @param ctx The tRPC context containing the Express request and user information.
 * @param routeName A unique string representing the route to limit.
 * @param limit The maximum number of requests allowed in the time window. Default: 30.
 * @param windowMs The time window in milliseconds. Default: 60000 (1 minute).
 */
export function checkRateLimit(
  ctx: TrpcContext,
  routeName: string,
  limit = 30,
  windowMs = 60000
) {
  const now = Date.now();
  
  // Extract identifier (User ID if logged in, otherwise client IP)
  const userId = ctx.user?.id;
  const ip =
    (ctx.req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
    ctx.req?.socket?.remoteAddress ||
    "anonymous";
    
  const key = `${userId ? `user_${userId}` : `ip_${ip}`}:${routeName}`;
  
  let entry = rateLimitMap.get(key);
  
  // Reset entry if window has expired
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
  }
  
  entry.count++;
  rateLimitMap.set(key, entry);
  
  if (entry.count > limit) {
    console.warn(`[RateLimit] Limit exceeded for key "${key}" (${entry.count}/${limit})`);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados pedidos. Tente novamente dentro de alguns instantes.",
    });
  }
}
