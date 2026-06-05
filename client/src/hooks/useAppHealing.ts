/**
 * useAppHealing — Core self-healing hook for AnimalMind
 *
 * Responsibilities:
 * - Capture and classify errors (network, auth, camera, UI, Supabase/RLS)
 * - Auto-retry transient failures with exponential back-off
 * - Persist errors to the server via tRPC (best-effort, non-blocking)
 * - Detect repeated patterns and escalate severity
 * - Expose a `reportError` function for imperative error reporting
 */
import { useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

// ─── Error Classification ───────────────────────────────────────────────────

export type ErrorSeverity = "info" | "warning" | "error" | "critical";
export type ErrorComponent =
  | "network"
  | "auth"
  | "camera"
  | "audio"
  | "trpc"
  | "supabase"
  | "rls"
  | "ui"
  | "classify"
  | "unknown";

export interface AppError {
  message: string;
  stack?: string | null;
  code?: string | null;
  severity: ErrorSeverity;
  component: ErrorComponent;
  context?: Record<string, unknown>;
}

// ─── Pattern Detection (in-memory) ─────────────────────────────────────────
// We track the last N errors per component to detect repeated patterns.
// The actual persistent record lives in Supabase (app_errors table).

const PATTERN_WINDOW_MS = 5 * 60 * 1000; // 5 min
const PATTERN_ESCALATE_THRESHOLD = 3;     // 3 identical errors → critical

interface ErrorRecord {
  timestamp: number;
  component: ErrorComponent;
  code: string | null;
}

const recentErrors: ErrorRecord[] = [];

function countRecentErrors(component: ErrorComponent, code: string | null): number {
  const cutoff = Date.now() - PATTERN_WINDOW_MS;
  return recentErrors.filter(
    (e) => e.timestamp > cutoff && e.component === component && e.code === code
  ).length;
}

function trackError(component: ErrorComponent, code: string | null) {
  recentErrors.push({ timestamp: Date.now(), component, code });
  // Keep only the last 100 to avoid memory growth
  if (recentErrors.length > 100) recentErrors.shift();
}

// ─── Error Classifier ───────────────────────────────────────────────────────

function classifyError(err: unknown, defaultComponent?: ErrorComponent): Omit<AppError, "context"> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  // Auth / session
  if (
    message.includes("UNAUTHORIZED") ||
    message.includes("token") ||
    message.includes("session") ||
    message.includes("JWT")
  ) {
    return { message, stack, code: "AUTH_ERROR", severity: "warning", component: "auth" };
  }

  // RLS / Supabase permissions
  if (
    message.includes("row-level security") ||
    message.includes("RLS") ||
    message.includes("permission denied") ||
    message.includes("violates row")
  ) {
    return { message, stack, code: "RLS_ERROR", severity: "error", component: "rls" };
  }

  // Network / backend unavailable
  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("ECONNREFUSED") ||
    message.includes("AbortError") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return { message, stack, code: "NETWORK_ERROR", severity: "warning", component: "network" };
  }

  // tRPC errors
  if (message.includes("TRPCClientError") || message.includes("trpc")) {
    return { message, stack, code: "TRPC_ERROR", severity: "error", component: "trpc" };
  }

  // Camera / media devices
  if (
    message.includes("NotAllowedError") ||
    message.includes("PermissionDenied") ||
    message.includes("getUserMedia") ||
    message.includes("mediaDevices")
  ) {
    return { message, stack, code: "CAMERA_PERMISSION", severity: "warning", component: "camera" };
  }

  // Audio / classification
  if (
    message.includes("audio") ||
    message.includes("AudioContext") ||
    message.includes("classify") ||
    message.includes("MediaRecorder")
  ) {
    return { message, stack, code: "AUDIO_ERROR", severity: "error", component: "audio" };
  }

  // React / UI render errors
  if (message.includes("render") || message.includes("React") || message.includes("Component")) {
    return { message, stack, code: "UI_RENDER_ERROR", severity: "error", component: "ui" };
  }

  return {
    message,
    stack,
    code: "UNKNOWN_ERROR",
    severity: "error",
    component: defaultComponent ?? "unknown",
  };
}

// ─── Retry helper ───────────────────────────────────────────────────────────

export async function withAutoRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; component?: ErrorComponent } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500 } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 200;
      console.warn(`[SelfHealing] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(delay)}ms…`, err);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAppHealing() {
  const logErrorMutation = trpc.healing.logError.useMutation();
  const mutationRef = useRef(logErrorMutation);
  mutationRef.current = logErrorMutation;

  const reportError = useCallback(
    (raw: unknown, context?: Record<string, unknown>, defaultComponent?: ErrorComponent) => {
      try {
        const classified = classifyError(raw, defaultComponent);

        // Track for pattern detection
        trackError(classified.component, classified.code ?? null);
        const repeatCount = countRecentErrors(classified.component, classified.code ?? null);

        // Escalate severity if this pattern is repeating
        let effectiveSeverity = classified.severity;
        if (repeatCount >= PATTERN_ESCALATE_THRESHOLD && effectiveSeverity !== "critical") {
          effectiveSeverity = "critical";
          console.warn(
            `[SelfHealing] Pattern detected: ${classified.component}/${classified.code} repeated ${repeatCount}x — escalating to CRITICAL`
          );
        }

        const enrichedContext = {
          route: window.location.pathname,
          online: navigator.onLine,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          repeatCount,
          ...(context ?? {}),
        };

        // Log to console
        console.error(`[SelfHealing] ${effectiveSeverity.toUpperCase()} [${classified.component}]:`, classified.message, enrichedContext);

        // Persist to server (best-effort, non-blocking)
        mutationRef.current
          .mutateAsync({
            errorMessage: classified.message,
            errorStack: classified.stack ?? null,
            errorCode: classified.code ?? null,
            severity: effectiveSeverity,
            component: classified.component,
            context: enrichedContext,
          })
          .catch((persistErr) => {
            // If we can't even log to the server, just console.warn — don't recurse
            console.warn("[SelfHealing] Could not persist error to server:", persistErr);
          });
      } catch (instrumentationError) {
        // Absolute last resort — instrumentation itself failed
        console.error("[SelfHealing] Instrumentation failed:", instrumentationError);
      }
    },
    []
  );

  return { reportError };
}
