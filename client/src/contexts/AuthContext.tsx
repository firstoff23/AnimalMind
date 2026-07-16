import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { storeOfflineQueueAuth } from "@/lib/offlineQueue";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingSupabaseConfigMessage =
  "A autenticação Supabase não está configurada. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel e faça novo deploy.";

function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

function syncOfflineQueueAuth(session: Session | null) {
  void storeOfflineQueueAuth(
    session?.access_token
      ? {
          accessToken: session.access_token,
          expiresAt: session.expires_at
            ? session.expires_at * 1000
            : Date.now() + 60 * 60 * 1000,
        }
      : null,
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(missingSupabaseConfigMessage);
  }

  return supabase;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, ageConfirmed: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string, type?: "signup" | "recovery") => Promise<void>;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    if (!supabase) {
      console.warn(missingSupabaseConfigMessage);
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        syncOfflineQueueAuth(currentSession);
      } catch (error) {
        console.error("Failed to get session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      syncOfflineQueueAuth(newSession);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await requireSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string, ageConfirmed: boolean) => {
    const { error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          age_confirmed: ageConfirmed,
        },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });
    if (error) throw error;
  };
  
  const verifyOtp = async (email: string, token: string, type: "signup" | "recovery" = "signup") => {
    const { error } = await requireSupabase().auth.verifyOtp({
      email,
      token,
      type,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    syncOfflineQueueAuth(null);
  };

  const isEmailVerified = !!user?.email_confirmed_at;

  const resendVerificationEmail = async (email: string) => {
    const { error } = await requireSupabase().auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });
    if (error) throw error;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    verifyOtp,
    isAuthenticated: !!user,
    isEmailVerified,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
