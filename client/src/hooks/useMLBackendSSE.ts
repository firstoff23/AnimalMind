/**
 * useMLBackendSSE
 *
 * Connects to the FastAPI /sse endpoint and listens for real-time
 * classification events. Displays toast notifications when a new
 * classification result arrives from the ML backend.
 *
 * This complements the Supabase Realtime hook (useRealtimeNotifications)
 * which handles DB-persisted events. This hook provides immediate feedback
 * directly from the ML inference pipeline (useful for long classifications).
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";

// The ML backend URL – falls back to the Fly.io primary backend.
const ML_BACKEND_BASE =
  import.meta.env.VITE_ML_BACKEND_URL ??
  import.meta.env.VITE_API_URL ??
  "https://animalmind-backend.fly.dev";

type ClassificationEvent = {
  type: "classification";
  ts: string;
  data: {
    state: string;
    confidence: number;
    emoji: string;
    model_used: string;
  };
};

type SSEEvent = ClassificationEvent | { type: string; ts: string; data: unknown };

const STATE_LABELS_PT: Record<string, string> = {
  distress: "Angústia",
  attention: "Atenção",
  excitement: "Excitação",
  hunger: "Fome",
  alert: "Alerta",
  relaxed: "Relaxado",
};

const STATE_LABELS_EN: Record<string, string> = {
  distress: "Distress",
  attention: "Attention",
  excitement: "Excitement",
  hunger: "Hunger",
  alert: "Alert",
  relaxed: "Relaxed",
};

export interface UseMLBackendSSEOptions {
  /** Whether the SSE connection should be active. Defaults to true. */
  enabled?: boolean;
  /** Display language for toast messages. Defaults to "pt". */
  language?: "pt" | "en";
  /**
   * Called when a classification event arrives.
   * If provided, the default toast is suppressed.
   */
  onClassification?: (event: ClassificationEvent["data"]) => void;
}

export function useMLBackendSSE({
  enabled = true,
  language = "pt",
  onClassification,
}: UseMLBackendSSEOptions = {}) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // EventSource is not available in all environments (e.g., SSR, Node.js tests)
    if (typeof EventSource === "undefined") return;

    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const url = `${ML_BACKEND_BASE}/sse`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", () => {
        console.log("[MLBackendSSE] Connected to", url);
      });

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as SSEEvent;

          if (parsed.type === "classification") {
            const { data } = parsed as ClassificationEvent;

            if (onClassification) {
              onClassification(data);
              return;
            }

            const stateLabel =
              language === "pt"
                ? (STATE_LABELS_PT[data.state] ?? data.state)
                : (STATE_LABELS_EN[data.state] ?? data.state);

            const confidence = Math.round(data.confidence * 100);
            const message =
              language === "pt"
                ? `${data.emoji} ${stateLabel} — ${confidence}% confiança`
                : `${data.emoji} ${stateLabel} — ${confidence}% confidence`;

            toast.info(message, {
              id: `ml-sse-classification`,
              duration: 5000,
            });
          }
        } catch {
          // Non-JSON keep-alive messages are silently ignored
        }
      };

      es.onerror = () => {
        console.warn("[MLBackendSSE] Connection error – reconnecting in 10s");
        es.close();
        esRef.current = null;
        if (isMounted) {
          reconnectTimerRef.current = setTimeout(connect, 10_000);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled, language, onClassification]);
}
