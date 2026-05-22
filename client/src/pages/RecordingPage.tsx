import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { STATE_LABELS, STATE_COLORS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

type RecordingState = "idle" | "recording" | "processing";

interface ClassifyResult {
  state: EmotionalState;
  confidence: number;
  emoji: string;
  model_used: string;
  cached: boolean;
  eventId?: number;
}

// ─── Confidence Bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "#10b981" : pct >= 60 ? "#eab308" : "#ef4444";
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Confiança</span>
        <span style={{ color }} className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onFeedback,
}: {
  result: ClassifyResult;
  onFeedback: (feedback: "correct" | "incorrect") => void;
}) {
  const [feedbackSent, setFeedbackSent] = useState<"correct" | "incorrect" | null>(null);

  const handleFeedback = (f: "correct" | "incorrect") => {
    setFeedbackSent(f);
    onFeedback(f);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter">
      {/* Emoji + state */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl leading-none">{result.emoji}</span>
        <span
          className="text-xl font-bold"
          style={{ color: STATE_COLORS[result.state] }}
        >
          {STATE_LABELS[result.state]}
        </span>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar confidence={result.confidence} />

      {/* Model badge */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs uppercase tracking-wide">
          {result.model_used}
        </Badge>
      </div>

      {/* Feedback buttons */}
      <div className="flex gap-3">
        <Button
          variant={feedbackSent === "correct" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => handleFeedback("correct")}
          disabled={feedbackSent !== null}
        >
          <ThumbsUp size={16} />
          Correcto
        </Button>
        <Button
          variant={feedbackSent === "incorrect" ? "destructive" : "outline"}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => handleFeedback("incorrect")}
          disabled={feedbackSent !== null}
        >
          <ThumbsDown size={16} />
          Incorrecto
        </Button>
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ event }: { event: { state: string; confidence: number; emoji: string; modelUsed: string; createdAt: Date } }) {
  const state = event.state as EmotionalState;
  const pct = Math.round(event.confidence * 100);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-2xl">{event.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: STATE_COLORS[state] }}>
          {STATE_LABELS[state]}
        </p>
        <p className="text-xs text-muted-foreground">{event.modelUsed}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{pct}%</p>
        <p className="text-xs text-muted-foreground">
          {new Date(event.createdAt).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Recording Page ───────────────────────────────────────────────────────────

export default function RecordingPage() {
  const [recordState, setRecordState] = useState<RecordingState>("idle");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const { sendNotification } = useNotifications();

  const utils = trpc.useUtils();
  const { data: activeAnimal } = trpc.animals.getActive.useQuery();
  const { data: recentEvents = [] } = trpc.events.recent.useQuery({ limit: 5 });
  const { data: settingsData } = trpc.settings.get.useQuery();

  const classifyMutation = trpc.classify.run.useMutation({
    onSuccess: (data) => {
      const res = data as ClassifyResult;
      setResult(res);
      setRecordState("idle");
      utils.events.recent.invalidate();

      // Check for critical states
      if (activeAnimal && (res.state === "distress" || res.state === "hunger")) {
        sendNotification(
          res.state,
          res.confidence,
          activeAnimal.name,
          String(activeAnimal.id),
          settingsData?.alertSensitivity ?? "medium",
          settingsData?.notificationsEnabled ?? true
        );
      }
    },
    onError: () => {
      setRecordState("idle");
      toast.error("Erro ao classificar o áudio. Tente novamente.");
    },
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => toast.success("Obrigado pelo feedback!"),
  });

  // Countdown timer during recording
  useEffect(() => {
    if (recordState !== "recording") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setRecordState("processing");
          classifyMutation.mutate({ animalId: activeAnimal?.id });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recordState]);

  const handleRecord = () => {
    if (recordState !== "idle") return;
    setResult(null);
    setRecordState("recording");
  };

  const buttonColor =
    recordState === "idle"
      ? "bg-primary hover:bg-emerald-600"
      : recordState === "recording"
      ? "bg-red-500 record-pulse"
      : "bg-yellow-500";

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">AnimalMind</h1>
        {activeAnimal ? (
          <p className="text-sm text-muted-foreground">
            {activeAnimal.species === "dog" ? "🐕" : "🐈"} {activeAnimal.name}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum animal seleccionado</p>
        )}
      </div>

      {/* Recording button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRecord}
          disabled={recordState !== "idle"}
          className={cn(
            "w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2",
            "text-white font-semibold shadow-2xl transition-all duration-300",
            "active:scale-95 disabled:cursor-not-allowed",
            buttonColor
          )}
          aria-label="Iniciar gravação"
        >
          {recordState === "idle" && (
            <>
              <Mic size={40} strokeWidth={1.5} />
              <span className="text-sm">Gravar</span>
            </>
          )}
          {recordState === "recording" && (
            <>
              <MicOff size={40} strokeWidth={1.5} />
              <span className="text-3xl font-bold">{countdown}</span>
            </>
          )}
          {recordState === "processing" && (
            <>
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">A analisar…</span>
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          {recordState === "idle" && "Toque para iniciar a gravação de 3 segundos"}
          {recordState === "recording" && "A gravar…"}
          {recordState === "processing" && "A processar com IA…"}
        </p>
      </div>

      {/* Result card */}
      {result && (
        <ResultCard
          result={result}
          onFeedback={(feedback) => {
            if (result.eventId) {
              feedbackMutation.mutate({ eventId: result.eventId, feedback });
            }
          }}
        />
      )}

      {/* Recent history */}
      {recentEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Últimas classificações
            </h2>
          </div>
          {recentEvents.map((event) => (
            <HistoryItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
