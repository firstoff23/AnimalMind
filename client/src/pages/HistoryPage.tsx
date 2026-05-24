import { useRef, useState, type PointerEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  LONG_PRESS_DELAY_MS,
  isLongPressMovementAllowed,
} from "@/lib/longPress";
import {
  clampSwipeOffset,
  resolveSwipeFeedback,
  type SwipeFeedback,
  SWIPE_FEEDBACK_THRESHOLD,
} from "@/lib/swipeFeedback";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  STATE_LABELS,
  STATE_COLORS,
  STATE_EMOJIS,
} from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";
import { motion, useMotionValue, useTransform } from "framer-motion";

const PAGE_SIZE = 10;

const ALL_STATES: (EmotionalState | "all")[] = [
  "all",
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

const STATE_FILTER_LABELS: Record<string, string> = {
  all: "Todos",
  ...STATE_LABELS,
};

interface HistoryEvent {
  id: number;
  state: string;
  confidence: number;
  emoji: string;
  modelUsed: string;
  feedback: string | null;
  createdAt: Date;
  notes?: string | null;
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({
  event,
  onFeedback,
  onOpenRawData,
  disabled,
}: {
  event: HistoryEvent;
  onFeedback: (eventId: number, feedback: SwipeFeedback) => void;
  onOpenRawData: (event: HistoryEvent) => void;
  disabled: boolean;
}) {
  const x = useMotionValue(0);
  
  // Transform backgrounds opacity based on x offset
  const opacityCorrect = useTransform(x, [0, SWIPE_FEEDBACK_THRESHOLD], [0, 1]);
  const opacityIncorrect = useTransform(x, [-SWIPE_FEEDBACK_THRESHOLD, 0], [1, 0]);

  const longPressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const latestPointerRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const state = event.state as EmotionalState;
  const pct = Math.round(event.confidence * 100);
  const color = STATE_COLORS[state];

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (disabled || pointerEvent.button !== 0) return;
    const point = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    pressOriginRef.current = point;
    latestPointerRef.current = point;
    isDraggingRef.current = false;
    clearLongPressTimer();
    
    longPressTimerRef.current = window.setTimeout(() => {
      const origin = pressOriginRef.current;
      const latest = latestPointerRef.current;
      if (!origin || !latest || isDraggingRef.current) return;
      if (!isLongPressMovementAllowed(latest.x - origin.x, latest.y - origin.y))
        return;
      onOpenRawData(event);
      x.set(0); // Centrar a linha
    }, LONG_PRESS_DELAY_MS);
  };

  const handlePointerMove = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const point = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    latestPointerRef.current = point;
    const origin = pressOriginRef.current;
    if (
      origin &&
      !isLongPressMovementAllowed(point.x - origin.x, point.y - origin.y)
    ) {
      clearLongPressTimer();
    }
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
  };

  const handleDrag = (e: any, info: any) => {
    isDraggingRef.current = true;
    clearLongPressTimer();
  };

  const handleDragEnd = (e: any, info: any) => {
    clearLongPressTimer();
    const currentX = info.offset.x;
    const feedback = resolveSwipeFeedback(currentX);
    if (feedback && feedback !== event.feedback) {
      onFeedback(event.id, feedback);
    }
    isDraggingRef.current = false;
  };

  return (
    <div
      className="relative select-none overflow-hidden border-b border-border last:border-0 bg-secondary/15"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: "pan-y" }}
      aria-label="Classificação no histórico"
    >
      {/* Correct background (Green) - Swiping Right */}
      <motion.div 
        className="absolute inset-y-0 left-0 flex items-center gap-2 px-4 text-xs font-semibold text-emerald-400 bg-emerald-950/70"
        style={{ opacity: opacityCorrect, width: "100%" }}
      >
        <ThumbsUp size={16} aria-hidden="true" />
        <span>Correcto</span>
      </motion.div>

      {/* Incorrect background (Red) - Swiping Left */}
      <motion.div 
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-4 text-xs font-semibold text-red-400 bg-red-950/70"
        style={{ opacity: opacityIncorrect, width: "100%" }}
      >
        <span>Incorrecto</span>
        <ThumbsDown size={16} aria-hidden="true" />
      </motion.div>

      {/* Main card containing row content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0.6 }}
        style={{ x }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative z-10 flex items-center gap-3 py-3 bg-card px-4 cursor-grab active:cursor-grabbing",
          disabled && "opacity-60",
        )}
      >
        <span className="text-2xl flex-shrink-0">{event.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color }}>
              {STATE_LABELS[state]}
            </span>
            {event.feedback && (
              <span className="text-xs">
                {event.feedback === "correct" ? "👍" : "👎"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {event.modelUsed.toUpperCase()} ·{" "}
            {new Date(event.createdAt).toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            {new Date(event.createdAt).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {event.notes && (
            <p className="text-[11px] text-cyan-400 italic mt-0.5 truncate max-w-[260px]">
              📝 "{event.notes}"
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-sm font-bold"
            style={{
              color: pct >= 80 ? "#10b981" : pct >= 60 ? "#eab308" : "#ef4444",
            }}
          >
            {pct}%
          </div>
          <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor:
                  pct >= 80 ? "#10b981" : pct >= 60 ? "#eab308" : "#ef4444",
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatRawEvent(event: HistoryEvent): string {
  return JSON.stringify(
    {
      id: event.id,
      state: event.state,
      confidence: event.confidence,
      confidencePercent: `${Math.round(event.confidence * 100)}%`,
      emoji: event.emoji,
      modelUsed: event.modelUsed,
      feedback: event.feedback,
      notes: event.notes,
      createdAt: new Date(event.createdAt).toISOString(),
    },
    null,
    2,
  );
}

function RawEventDialog({
  event,
  onOpenChange,
}: {
  event: HistoryEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  const state = event?.state as EmotionalState | undefined;
  const pct = event ? Math.round(event.confidence * 100) : 0;

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      {event && state && (
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dados brutos</DialogTitle>
            <DialogDescription>Registo #{event.id}</DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className="font-semibold text-foreground">
                {STATE_LABELS[state]}
              </dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Confiança</dt>
              <dd className="font-semibold text-foreground">{pct}%</dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Modelo</dt>
              <dd className="font-semibold text-foreground">
                {event.modelUsed.toUpperCase()}
              </dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Feedback</dt>
              <dd className="font-semibold text-foreground">
                {event.feedback ?? "Sem feedback"}
              </dd>
            </div>
            {/* Notas section */}
            <div className="rounded-lg bg-secondary p-3 col-span-2">
              <dt className="text-xs text-muted-foreground">Nota de Observação</dt>
              <dd className="font-medium text-foreground italic mt-1 whitespace-pre-wrap">
                {event.notes || "Sem notas de observação adicionadas."}
              </dd>
            </div>
          </dl>

          <pre className="max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
            {formatRawEvent(event)}
          </pre>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <span className="text-5xl">{filtered ? "🔍" : "🎙️"}</span>
      <p className="font-semibold text-foreground">
        {filtered ? "Sem resultados" : "Sem histórico ainda"}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {filtered
          ? "Tente ajustar os filtros para encontrar registos."
          : "Grave o som do seu animal para ver o histórico de classificações aqui."}
      </p>
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [rawEvent, setRawEvent] = useState<HistoryEvent | null>(null);

  const isFiltered = stateFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const { data, isLoading } = trpc.events.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    state: stateFilter !== "all" ? stateFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const events = (data?.events ?? []) as HistoryEvent[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const utils = trpc.useUtils();
  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Classificação actualizada");
    },
    onError: () => toast.error("Não foi possível guardar o feedback."),
  });

  const clearFilters = () => {
    setStateFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Histórico</h1>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground gap-1 h-8 px-2"
            >
              <X size={14} />
              Limpar
            </Button>
          )}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "gap-1.5 h-8",
              showFilters && "bg-primary text-primary-foreground",
            )}
          >
            <Filter size={14} />
            Filtros
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 page-enter">
          {/* State filter */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Estado emocional
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStateFilter(s);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150",
                    stateFilter === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {s !== "all" && STATE_EMOJIS[s as EmotionalState]}{" "}
                  {STATE_FILTER_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter badges */}
      {isFiltered && (
        <div className="flex flex-wrap gap-1.5">
          {stateFilter !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1">
              {STATE_EMOJIS[stateFilter as EmotionalState]}{" "}
              {STATE_LABELS[stateFilter as EmotionalState]}
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="text-xs">
              De: {dateFrom}
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="text-xs">
              Até: {dateTo}
            </Badge>
          )}
        </div>
      )}

      {/* Events list */}
      <div className="bg-card border border-border rounded-2xl px-4">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState filtered={isFiltered} />
        ) : (
          events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              disabled={feedbackMutation.isPending}
              onOpenRawData={setRawEvent}
              onFeedback={(eventId, feedback) => {
                feedbackMutation.mutate({ eventId, feedback });
              }}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="gap-1"
          >
            <ChevronLeft size={16} />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="gap-1"
          >
            Seguinte
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Total count */}
      {total > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {total} {total === 1 ? "registo" : "registos"} no total
        </p>
      )}

      <RawEventDialog
        event={rawEvent}
        onOpenChange={(open) => {
          if (!open) setRawEvent(null);
        }}
      />
    </div>
  );
}
