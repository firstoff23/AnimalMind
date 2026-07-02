import type { Request } from "express";
import type { User } from "../../shared/dbTypes";
import { getSupabase, getUserByOpenId, upsertUser } from "../db";
import { sdk } from "./sdk";

export async function authenticateExpressRequest(
  req: Request,
): Promise<User | null> {
  let user: User | null = null;

  // 1. Try to authenticate via Authorization header (Supabase JWT token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const supabase = getSupabase();
      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser(token);
      if (supabaseUser && !error) {
        // Query user from local database using their Supabase UID (open_id)
        user = await getUserByOpenId(supabaseUser.id);

        // If not in database, sync/upsert them
        if (!user) {
          const name =
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split("@")[0] ||
            "Supabase User";

          await upsertUser({
            openId: supabaseUser.id,
            name,
            email: supabaseUser.email ?? null,
            loginMethod: "email",
            role: "owner",
            lastSignedIn: new Date(),
          });
          user = await getUserByOpenId(supabaseUser.id);
        } else {
          // Update last signed in
          await upsertUser({
            openId: user.openId,
            name: user.name,
            email: user.email,
            loginMethod: user.loginMethod,
            role: user.role === "user" ? "owner" : user.role,
            lastSignedIn: new Date(),
          });
        }
      }
    } catch (err) {
      console.error("[Auth] Supabase token auth failed in Express:", err);
    }
  }

  // 2. Fallback to standard cookie session auth if header auth wasn't used/found
  if (!user) {
    try {
      user = await sdk.authenticateRequest(req);
    } catch (_error) {
      user = null;
    }
  }

  return user;
}
