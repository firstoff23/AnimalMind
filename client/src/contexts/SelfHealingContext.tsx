/**
 * SelfHealingProvider — Global error capture bridge for PeloNaRoupa
 *
 * Intercepts:
 * - window.onerror  (uncaught JS errors)
 * - window.unhandledrejection  (uncaught promise rejections)
 * - React error boundaries (via ErrorBoundary)
 * - tRPC query/mutation cache errors (patched in main.tsx via QueryClient)
 *
 * Emits errors into useAppHealing.reportError for persistence + learning.
 */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { trpc } from "@/lib/trpc";

// ─── Context ────────────────────────────────────────────────────────────────

export interface SelfHealingContextValue {
  reportError: (
    raw: unknown,
    context?: Record<string, unknown>,
    component?: string,
  ) => void;
}

const SelfHealingContext = createContext<SelfHealingContextValue | null>(null);

export function useSelfHealing(): SelfHealingContextValue {
  const ctx = useContext(SelfHealingContext);
  if (!ctx)
    throw new Error("useSelfHealing must be inside SelfHealingProvider");
  return ctx;
}

// ─── Pattern tracking ────────────────────────────────────────────────────────

const WINDOW_MS = 5 * 60 * 1000;
const ESCALATE_AT = 3;

interface TrackedError {
  ts: number;
  component: string;
  code: string;
}
const tracked: TrackedError[] = [];

function trackAndCountRepeats(component: string, code: string): number {
  const cutoff = Date.now() - WINDOW_MS;
  tracked.push({ ts: Date.now(), component, code });
  if (tracked.length > 200) tracked.shift();
  return tracked.filter(
    (e) => e.ts > cutoff && e.component === component && e.code === code,
  ).length;
}

// ─── Classifier ──────────────────────────────────────────────────────────────

type Severity = "info" | "warning" | "error" | "critical";

function classify(raw: unknown): {
  message: string;
  stack?: string | null;
  code: string;
  severity: Severity;
  component: string;
} {
  const msg = raw instanceof Error ? raw.message : String(raw);
  const stack = raw instanceof Error ? raw.stack : undefined;

  if (
    msg.includes("UNAUTHORIZED") ||
    msg.includes("token") ||
    msg.includes("JWT") ||
    msg.includes("session expired")
  )
    return {
      message: msg,
      stack,
      code: "AUTH_ERROR",
      severity: "warning",
      component: "auth",
    };

  if (
    msg.includes("row-level security") ||
    msg.includes("RLS") ||
    msg.includes("permission denied")
  )
    return {
      message: msg,
      stack,
      code: "RLS_ERROR",
      severity: "error",
      component: "rls",
    };

  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("AbortError") ||
    msg.includes("timeout") ||
    msg.includes("503")
  )
    return {
      message: msg,
      stack,
      code: "NETWORK_ERROR",
      severity: "warning",
      component: "network",
    };

  if (
    msg.includes("NotAllowedError") ||
    msg.includes("getUserMedia") ||
    msg.includes("mediaDevices")
  )
    return {
      message: msg,
      stack,
      code: "CAMERA_PERMISSION",
      severity: "warning",
      component: "camera",
    };

  if (
    msg.includes("AudioContext") ||
    msg.includes("MediaRecorder") ||
    msg.includes("audio")
  )
    return {
      message: msg,
      stack,
      code: "AUDIO_ERROR",
      severity: "error",
      component: "audio",
    };

  if (msg.includes("SERVICE_UNAVAILABLE") || msg.includes("classify"))
    return {
      message: msg,
      stack,
      code: "CLASSIFY_ERROR",
      severity: "error",
      component: "classify",
    };

  if (msg.includes("supabase") || msg.includes("PGRST"))
    return {
      message: msg,
      stack,
      code: "SUPABASE_ERROR",
      severity: "error",
      component: "supabase",
    };

  return {
    message: msg,
    stack,
    code: "UNKNOWN_ERROR",
    severity: "error",
    component: "unknown",
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SelfHealingProvider({ children }: { children: ReactNode }) {
  const logErrorMutation = trpc.healing.logError.useMutation();
  const mutRef = useRef(logErrorMutation);
  mutRef.current = logErrorMutation;

  const reportError = useCallback(
    (
      raw: unknown,
      ctx?: Record<string, unknown>,
      overrideComponent?: string,
    ) => {
      try {
        const classified = classify(raw);
        if (overrideComponent) classified.component = overrideComponent;

        const repeats = trackAndCountRepeats(
          classified.component,
          classified.code,
        );
        let severity: Severity = classified.severity;
        if (repeats >= ESCALATE_AT && severity !== "critical") {
          severity = "critical";
          console.warn(
            `[SelfHealing] Pattern: ${classified.component}/${classified.code} × ${repeats} → CRITICAL`,
          );
        }

        const enriched = {
          route:
            typeof window !== "undefined" ? window.location.pathname : "ssr",
          online: typeof navigator !== "undefined" ? navigator.onLine : true,
          timestamp: new Date().toISOString(),
          repeats,
          ...(ctx ?? {}),
        };

        console.error(
          `[SelfHealing] ${severity.toUpperCase()} [${classified.component}]:`,
          classified.message,
          enriched,
        );

        // Fire-and-forget — never block the UI
        mutRef.current
          .mutateAsync({
            errorMessage: classified.message.slice(0, 2000),
            errorStack: classified.stack
              ? classified.stack.slice(0, 4000)
              : null,
            errorCode: classified.code,
            severity,
            component: classified.component,
            context: enriched,
          })
          .catch((e) => console.warn("[SelfHealing] persist failed:", e));
      } catch (e) {
        console.error("[SelfHealing] instrument error:", e);
      }
    },
    [],
  );

  // ── Global window hooks ───────────────────────────────────────────────────
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Filter noise from browser extensions / external scripts
      if (!event.filename || event.filename.includes("extension")) return;
      reportError(event.error ?? new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, { type: "unhandledRejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [reportError]);

  return (
    <SelfHealingContext.Provider value={{ reportError }}>
      {children}
    </SelfHealingContext.Provider>
  );
}
