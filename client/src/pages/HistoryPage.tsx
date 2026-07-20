import { motion, useMotionValue, useTransform } from "motion/react";
import { jsPDF } from "jspdf";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  Mic,
  PawPrint,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import {
  lazy,
  memo,
  type PointerEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { HowlerAudioPlayer } from "@/components/HowlerAudioPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  buildHistoryCsv,
  downloadTextFile,
  getAnimalScopeLabel,
  getPeriodLabel,
  type HistoryExportEvent,
} from "@/lib/historyExport";
import {
  isLongPressMovementAllowed,
  LONG_PRESS_DELAY_MS,
} from "@/lib/longPress";
import {
  resolveSwipeFeedback,
  SWIPE_FEEDBACK_THRESHOLD,
  type SwipeFeedback,
} from "@/lib/swipeFeedback";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import {
  STATE_COLORS,
  STATE_EMOJIS,
  STATE_LABELS,
} from "../../../shared/types";

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

const _STATE_FILTER_LABELS: Record<string, string> = {
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
  audioUrl?: string | null;
  animalId?: number | null;
  animalName?: string | null;
  contextTags?: string[];
}

// ─── Event Row ────────────────────────────────────────────────────────────────

const EventRow = memo(function EventRow({
  event,
  onFeedback,
  onOpenRawData,
  disabled,
  isPlaying,
  onPlayToggle,
}: {
  event: HistoryEvent;
  onFeedback: (eventId: number, feedback: SwipeFeedback) => void;
  onOpenRawData: (event: HistoryEvent) => void;
  disabled: boolean;
  isPlaying: boolean;
  onPlayToggle: (eventId: number, audioUrl: string) => void;
}) {
  const { t, language } = useLanguage();
  const x = useMotionValue(0);

  // Transform backgrounds opacity based on x offset
  const opacityCorrect = useTransform(x, [0, SWIPE_FEEDBACK_THRESHOLD], [0, 1]);
  const opacityIncorrect = useTransform(
    x,
    [-SWIPE_FEEDBACK_THRESHOLD, 0],
    [1, 0],
  );

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

  const handleDrag = (_e: any, _info: any) => {
    isDraggingRef.current = true;
    clearLongPressTimer();
  };

  const handleDragEnd = (_e: any, info: any) => {
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
        <span>{t("recordingPage.correct")}</span>
      </motion.div>

      {/* Incorrect background (Red) - Swiping Left */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-4 text-xs font-semibold text-red-400 bg-red-950/70"
        style={{ opacity: opacityIncorrect, width: "100%" }}
      >
        <span>{t("recordingPage.incorrect")}</span>
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
              {t(`states.${state}` as any) || STATE_LABELS[state]}
            </span>
            {event.feedback && (
              <span className="text-xs">
                {event.feedback === "correct" ? (
                  <ThumbsUp
                    size={12}
                    className="text-emerald-400 inline"
                    aria-label="Correct"
                  />
                ) : (
                  <ThumbsDown
                    size={12}
                    className="text-red-400 inline"
                    aria-label="Incorrect"
                  />
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {event.modelUsed.toUpperCase()} ·{" "}
            {new Date(event.createdAt).toLocaleDateString(
              language === "pt" ? "pt-PT" : "en-US",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            )}{" "}
            {new Date(event.createdAt).toLocaleTimeString(
              language === "pt" ? "pt-PT" : "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </p>
          {event.notes && (
            <p className="text-[11px] text-cyan-400 italic mt-0.5 truncate max-w-[260px] flex items-center gap-1">
              <FileText size={10} className="flex-shrink-0" />
              <span className="truncate">&ldquo;{event.notes}&rdquo;</span>
            </p>
          )}
        </div>

        {event.audioUrl && (
          <div onClick={(e) => e.stopPropagation()}>
            <HowlerAudioPlayer audioUrl={event.audioUrl} />
          </div>
        )}

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
});

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
  const { t } = useLanguage();
  const state = event?.state as EmotionalState | undefined;
  const pct = event ? Math.round(event.confidence * 100) : 0;

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      {event && state && (
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("historyPage.rawData")}</DialogTitle>
            <DialogDescription>
              {t("historyPage.recordNo")}
              {event.id}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">
                {t("historyPage.tableState")}
              </dt>
              <dd className="font-semibold text-foreground">
                {t(`states.${state}` as any) || STATE_LABELS[state]}
              </dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">
                {t("historyPage.tableConf")}
              </dt>
              <dd className="font-semibold text-foreground">{pct}%</dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">
                {t("historyPage.tableModel")}
              </dt>
              <dd className="font-semibold text-foreground">
                {event.modelUsed.toUpperCase()}
              </dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Feedback</dt>
              <dd className="font-semibold text-foreground">
                {event.feedback ?? t("historyPage.noFeedback")}
              </dd>
            </div>
            {/* Notas section */}
            <div className="rounded-lg bg-secondary p-3 col-span-2">
              <dt className="text-xs text-muted-foreground">
                {t("recordingPage.observationNote")}
              </dt>
              <dd className="font-medium text-foreground italic mt-1 whitespace-pre-wrap">
                {event.notes || t("historyPage.noNotesAdded")}
              </dd>
            </div>
            {/* Audio section */}
            {event.audioUrl && (
              <div className="rounded-lg bg-secondary p-3 col-span-2 flex flex-col gap-1.5">
                <dt className="text-xs text-muted-foreground">
                  {t("historyPage.animalRecording")}
                </dt>
                <dd className="mt-1">
                  <HowlerAudioPlayer audioUrl={event.audioUrl} />
                </dd>
              </div>
            )}
          </dl>

          <pre className="max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
            {formatRawEvent(event)}
          </pre>
        </DialogContent>
      )}
    </Dialog>
  );
}


function groupEventsByDay(events: HistoryEvent[], language: string) {
  const groups: Record<string, HistoryEvent[]> = {};
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  for (const event of events) {
    const date = new Date(event.createdAt);
    let label = "";
    
    if (isSameDay(date, today)) {
      label = language === "pt" ? "Hoje" : "Today";
    } else if (isSameDay(date, yesterday)) {
      label = language === "pt" ? "Ontem" : "Yesterday";
    } else {
      label = date.toLocaleDateString(
        language === "pt" ? "pt-PT" : "en-US",
        { day: "numeric", month: "long" }
      );
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(event);
  }
  return groups;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  const { t, language } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="w-16 h-16 rounded-full bg-secondary/60 flex items-center justify-center">
        {filtered ? (
          <Search size={28} className="text-muted-foreground" />
        ) : (
          <PawPrint size={28} className="text-muted-foreground" />
        )}
      </div>
      <p className="font-semibold text-foreground">
        {filtered
          ? (language === "pt" ? "Sem resultados" : "No results")
          : (language === "pt" ? "Sem histórico ainda" : "No history yet")}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {filtered
          ? (language === "pt" ? "Tente ajustar os filtros para encontrar registos." : "Try adjusting the filters to find records.")
          : (language === "pt" ? "Grave o som do seu animal para ver o histórico de classificações aqui." : "Record your pet's sound to see classification history here.")}
      </p>
      {!filtered && (
        <Link href="/capturar">
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2 border-primary/30 hover:bg-primary/10"
          >
            <Mic size={16} className="text-primary animate-pulse" />
            <span>{language === "pt" ? "Fazer gravação" : "Record audio"}</span>
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [_page, setPage] = useState(1);

  // nuqs URL query state hooks
  const [animalParam, setAnimalParam] = useQueryState("animal", parseAsInteger);
  const [animalIdLegacyParam, setAnimalIdLegacyParam] = useQueryState(
    "animalId",
    parseAsInteger,
  );
  const [emotionParam, setEmotionParam] = useQueryState("emotion", {
    defaultValue: "all",
  });
  const [dateFromParam, setDateFromParam] = useQueryState("dateFrom", {
    defaultValue: "",
  });
  const [dateToParam, setDateToParam] = useQueryState("dateTo", {
    defaultValue: "",
  });
  const [period, setPeriod] = useQueryState("period", { defaultValue: "" });
  const [contextTagParam, setContextTagParam] = useQueryState("contextTag", {
    defaultValue: "",
  });

  const animalIdFilter =
    animalParam !== null
      ? animalParam
      : animalIdLegacyParam !== null
        ? animalIdLegacyParam
        : undefined;

  const stateFilter = emotionParam || "all";
  const setStateFilter = (val: string) => {
    setEmotionParam(val === "all" ? null : val);
  };

  const contextTagFilter = contextTagParam || "all";
  const setContextTagFilter = (val: string) => {
    setContextTagParam(val === "all" ? null : val);
  };

  const dateFrom = dateFromParam || "";
  const setDateFrom = (val: string) => {
    setDateFromParam(val || null);
  };

  const dateTo = dateToParam || "";
  const setDateTo = (val: string) => {
    setDateToParam(val || null);
  };

  // Sync period filter
  useEffect(() => {
    if (period === "week") {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setDateFromParam(past.toISOString().split("T")[0]);
      setDateToParam(now.toISOString().split("T")[0]);
    } else if (period === "month") {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setDateFromParam(past.toISOString().split("T")[0]);
      setDateToParam(now.toISOString().split("T")[0]);
    }
  }, [period, setDateFromParam, setDateToParam]);

  const [showFilters, setShowFilters] = useState(false);
  const [showExportActions, setShowExportActions] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | null>(null);
  const [rawEvent, setRawEvent] = useState<HistoryEvent | null>(null);
  const [playingEventId, setPlayingEventId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, setLocation] = useLocation();

  const { data: animals = [], refetch: refetchAnimals } =
    trpc.animals.list.useQuery();
  const filterAnimal = animals.find((animal) => animal.id === animalIdFilter);

  const _handlePlayToggle = (eventId: number, audioUrl: string) => {
    if (playingEventId === eventId) {
      audioRef.current?.pause();
      setPlayingEventId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioObj = new Audio(audioUrl);
      audioRef.current = audioObj;
      setPlayingEventId(eventId);
      audioObj.play().catch((err) => {
        console.error("Audio playback failed:", err);
        setPlayingEventId(null);
      });
      audioObj.onended = () => {
        setPlayingEventId(null);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const isFiltered = stateFilter !== "all" || contextTagFilter !== "all" || dateFrom !== "" || dateTo !== "";
  const hasAnimalFilter = typeof animalIdFilter === "number";
  const useAnimalEndpoint = hasAnimalFilter && !isFiltered;

  const allEventsQuery = trpc.events.list.useQuery(
    {
      page: 1,
      pageSize: 1000,
      state: stateFilter !== "all" ? stateFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      animalId: animalIdFilter,
      contextTag: contextTagFilter !== "all" ? contextTagFilter : undefined,
    },
    { enabled: !useAnimalEndpoint },
  );

  const animalEventsQuery = trpc.events.listForAnimal.useQuery(
    {
      animalId: animalIdFilter!,
      page: 1,
      pageSize: 1000,
    },
    {
      enabled:
        useAnimalEndpoint &&
        typeof animalIdFilter === "number" &&
        !Number.isNaN(animalIdFilter),
    },
  );

  const data = useAnimalEndpoint ? animalEventsQuery.data : allEventsQuery.data;
  const isLoading = useAnimalEndpoint
    ? animalEventsQuery.isLoading
    : allEventsQuery.isLoading;
  const queryError = useAnimalEndpoint
    ? animalEventsQuery.error
    : allEventsQuery.error;
  const refetchData = useAnimalEndpoint
    ? animalEventsQuery.refetch
    : allEventsQuery.refetch;

  const handleRefresh = async () => {
    await Promise.all([refetchAnimals(), refetchData()]);
  };

  const { pullDistance, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh);

  const events = (data?.events ?? []) as HistoryEvent[];
  const total = data?.total ?? 0;
  const _totalPages = Math.ceil(total / PAGE_SIZE);
  const utils = trpc.useUtils();
  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      utils.events.listForAnimal.invalidate();
      toast.success(
        language === "pt"
          ? "Classificação atualizada"
          : "Classification updated",
      );
    },
    onError: () =>
      toast.error(
        language === "pt"
          ? "Não foi possível guardar o feedback."
          : "Could not save feedback.",
      ),
  });
  const exportMutation = trpc.events.exportData.useMutation();


  const clearFilters = () => {
    setEmotionParam(null);
    setDateFromParam(null);
    setDateToParam(null);
    setPeriod(null);
    setPage(1);
  };

  const handleAnimalFilter = (value: string) => {
    setPage(1);
    setAnimalParam(value === "all" ? null : parseInt(value, 10));
    setAnimalIdLegacyParam(null);
  };

  const exportFilters = {
    state: stateFilter !== "all" ? stateFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    animalId: animalIdFilter,
  };

  const loadExportEvents = async () => {
    const result = await exportMutation.mutateAsync(exportFilters);
    return result.events as HistoryExportEvent[];
  };

  const exportFileDate = () => new Date().toISOString().slice(0, 10);

  const handleExportCsv = async () => {
    setExportFormat("csv");
    try {
      const exportEvents = await loadExportEvents();
      if (exportEvents.length === 0) {
        toast.info(t("historyPage.noRecordsExport"));
        return;
      }
      const csv = buildHistoryCsv(exportEvents);
      downloadTextFile(
        `\uFEFF${csv}`,
        "text/csv;charset=utf-8",
        `pawra-historico-${exportFileDate()}.csv`,
      );
      toast.success(t("historyPage.csvExported"));
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error(t("historyPage.csvExportFailed"));
    } finally {
      setExportFormat(null);
    }
  };

  const handleExportPdf = async () => {
    setExportFormat("pdf");
    try {
      const exportEvents = await loadExportEvents();
      if (exportEvents.length === 0) {
        toast.info(t("historyPage.noRecordsExport"));
        return;
      }

      // Check if we can fetch base64 of the animal photo
      let photoBase64: string | null = null;
      if (filterAnimal?.photoUrl) {
        try {
          const res = await fetch(filterAnimal.photoUrl);
          const blob = await res.blob();
          photoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("Failed to fetch animal photo for PDF:", e);
        }
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const animalLabel = getAnimalScopeLabel(exportEvents);
      const periodLabel = getPeriodLabel(
        exportFilters.dateFrom,
        exportFilters.dateTo,
      );
      const generatedAt = new Date().toLocaleString(
        language === "pt" ? "pt-PT" : "en-US",
      );

      const drawPhotoFallback = () => {
        doc.setFillColor(226, 232, 240); // slate-200
        doc.circle(267, 24, 12, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text(animalLabel.slice(0, 2).toUpperCase(), 267, 27, {
          align: "center",
        });
      };

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(
          language === "pt"
            ? "Pawra - Histórico de classificações"
            : "Pawra - Classification History",
          14,
          16,
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`${t("historyPage.animal")}: ${animalLabel}`, 14, 24);
        doc.text(
          `${language === "pt" ? "Período" : "Period"}: ${periodLabel}`,
          14,
          30,
        );
        doc.text(
          `${language === "pt" ? "Gerado em" : "Generated at"}: ${generatedAt}`,
          14,
          36,
        );

        // Draw photo at top right
        if (photoBase64) {
          try {
            doc.addImage(photoBase64, "JPEG", 255, 12, 24, 24);
            doc.setDrawColor(16, 185, 129); // emerald
            doc.setLineWidth(0.5);
            doc.rect(255, 12, 24, 24);
          } catch (e) {
            console.error("Failed to add image to PDF:", e);
            drawPhotoFallback();
          }
        } else {
          drawPhotoFallback();
        }
      };

      const columns = [
        { label: t("common.date"), x: 14, width: 35 },
        { label: t("historyPage.animal"), x: 52, width: 42 },
        { label: t("historyPage.tableState"), x: 98, width: 42 },
        { label: t("historyPage.tableConf").slice(0, 5), x: 144, width: 20 },
        { label: t("historyPage.tableModel"), x: 168, width: 42 },
        { label: "Feedback", x: 214, width: 32 },
        { label: language === "pt" ? "Áudio" : "Audio", x: 250, width: 32 },
      ];

      const truncate = (value: string, maxLength: number) =>
        value.length > maxLength
          ? `${value.slice(0, maxLength - 3)}...`
          : value;

      const drawTableHeader = (y: number) => {
        doc.setFillColor(16, 185, 129);
        doc.rect(12, y - 5, 272, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        columns.forEach((column) => doc.text(column.label, column.x, y));
        doc.setTextColor(0, 0, 0);
      };

      drawHeader();
      let y = 48;
      drawTableHeader(y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      exportEvents.forEach((event) => {
        if (y > 190) {
          doc.addPage();
          drawHeader();
          y = 48;
          drawTableHeader(y);
          y += 8;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
        }

        const state = event.state as EmotionalState;
        const row = [
          new Date(event.createdAt).toLocaleDateString(
            language === "pt" ? "pt-PT" : "en-US",
          ),
          event.animalName || `#${event.animalId ?? ""}`,
          t(`states.${state}` as any) || STATE_LABELS[state] || event.state,
          `${Math.round(Number(event.confidence) * 100)}%`,
          event.modelUsed,
          event.feedback ?? "",
          event.audioUrl
            ? language === "pt"
              ? "Sim"
              : "Yes"
            : language === "pt"
              ? "Não"
              : "No",
        ];

        columns.forEach((column, index) => {
          doc.text(
            truncate(String(row[index] ?? ""), Math.floor(column.width / 2)),
            column.x,
            y,
          );
        });
        y += 7;
      });

      // Appending dynamic bar chart of emotional states on a final summary page
      const counts: Record<string, number> = {
        relaxed: 0,
        excitement: 0,
        distress: 0,
        hunger: 0,
        alert: 0,
        attention: 0,
      };

      exportEvents.forEach((event) => {
        if (event.state in counts) {
          counts[event.state]++;
        }
      });

      doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(t("historyPage.emotionalEvolutionTitle"), 14, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `${language === "pt" ? "Resumo estatístico para" : "Statistical summary for"}: ${animalLabel}`,
        14,
        24,
      );
      doc.text(
        `${language === "pt" ? "Total de classificações" : "Total classifications"}: ${exportEvents.length}`,
        14,
        30,
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 35, 283, 35);

      // Draw Bar Chart
      const chartX = 60;
      const chartY = 130;
      const chartHeight = 70;
      const barWidth = 22;
      const barSpacing = 16;

      const maxCount = Math.max(...Object.values(counts), 1);
      const stateKeys = Object.keys(counts);

      stateKeys.forEach((state, i) => {
        const count = counts[state];
        const pctHeight = count / maxCount;
        const barH = pctHeight * chartHeight;

        const xPos = chartX + i * (barWidth + barSpacing);
        const yPos = chartY - barH;

        const hexColor = STATE_COLORS[state as EmotionalState] || "#94a3b8";
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        doc.setFillColor(r, g, b);
        doc.rect(xPos, yPos, barWidth, barH, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(String(count), xPos + barWidth / 2, yPos - 3, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const emoji = STATE_EMOJIS[state as EmotionalState] || "";
        const label =
          t(`states.${state}` as any) ||
          STATE_LABELS[state as EmotionalState] ||
          state;
        doc.text(`${emoji} ${label}`, xPos + barWidth / 2, chartY + 5, {
          align: "center",
        });
      });

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.5);
      doc.line(
        chartX - 5,
        chartY,
        chartX + stateKeys.length * (barWidth + barSpacing) - barSpacing + 5,
        chartY,
      );
      doc.line(chartX - 5, chartY, chartX - 5, chartY - chartHeight - 10);

      doc.save(`pawra-historico-${exportFileDate()}.pdf`);
      toast.success(t("historyPage.pdfExported"));
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Não foi possível exportar PDF.");
    } finally {
      setExportFormat(null);
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-full overflow-x-hidden" {...touchHandlers}>
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
          }}
        >
          <AppShellSkeleton mode="content" variant="history" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-hidden min-h-full" {...touchHandlers}>
      {/* Pull to refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-200 z-50"
        style={{
          top: `${pullDistance - 35}px`,
          opacity: pullDistance > 15 ? 1 : 0,
        }}
      >
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Loader2
            size={12}
            className={cn(
              "text-primary",
              (isRefreshing || pullDistance >= 80) && "animate-spin",
            )}
          />
          <span className="text-[10px] text-muted-foreground font-medium">
            {isRefreshing
              ? "A atualizar..."
              : pullDistance >= 80
                ? "Solte para atualizar"
                : "Puxe para atualizar"}
          </span>
        </div>
      </div>

      <div
        className="page-enter min-h-full px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {t("historyPage.title")}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/comparison")}
              className="gap-1.5 h-8 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 active-scale tap-highlight-none"
            >
              <ArrowUpDown size={14} className="rotate-90" />
              {t("nav.comparison") || "Comparar"}
            </Button>
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground gap-1 h-8 px-2"
              >
                <X size={14} />
                {t("historyPage.clear")}
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
              {t("historyPage.filters")}
            </Button>
            <Button
              variant={showExportActions ? "default" : "outline"}
              size="sm"
              onClick={() => setShowExportActions((v) => !v)}
              data-testid="history-export-toggle"
              className={cn(
                "gap-1.5 h-8",
                showExportActions && "bg-primary text-primary-foreground",
              )}
            >
              <Download size={14} />
              {t("historyPage.export")}
            </Button>
          </div>
        </div>

        {showExportActions && (
          <div className="grid grid-cols-2 gap-2 page-enter">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={exportMutation.isPending}
              data-testid="history-export-csv"
              className="h-10 gap-2"
            >
              <Download size={15} />
              {exportFormat === "csv" ? t("historyPage.generating") : "CSV"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exportMutation.isPending}
              data-testid="history-export-pdf"
              className="h-10 gap-2"
            >
              <FileText size={15} />
              {exportFormat === "pdf" ? t("historyPage.generating") : "PDF"}
            </Button>
          </div>
        )}

        
        {/* Filters panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4 page-enter">
            {/* Animal filter */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("historyPage.animal")}
              </p>
              <Select
                value={animalIdFilter ? String(animalIdFilter) : "all"}
                onValueChange={handleAnimalFilter}
              >
                <SelectTrigger
                  data-testid="history-animal-filter-trigger"
                  className="w-full bg-secondary border-border"
                >
                  <SelectValue placeholder={t("historyPage.allAnimals")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="inline-flex items-center gap-2">
                      <PawPrint size={14} />
                      {t("historyPage.allAnimals")}
                    </span>
                  </SelectItem>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={String(animal.id)}>
                      <span className="inline-flex items-center gap-1.5">
                        <PawPrint size={12} />
                        {animal.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State filter */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("historyPage.filterState")}
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
                    {s === "all"
                      ? t("historyPage.allStates")
                      : t(`states.${s}` as any) ||
                        STATE_LABELS[s as EmotionalState]}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("historyPage.dateFrom")}
                </label>
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
                <label className="text-xs text-muted-foreground">
                  {t("historyPage.dateTo")}
                </label>
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

            {/* Quick period presets */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("historyPage.quickPeriod")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("historyPage.7days"), days: 7 },
                  { label: t("historyPage.30days"), days: 30 },
                  { label: t("historyPage.90days"), days: 90 },
                ].map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-border bg-secondary hover:bg-secondary/80 text-foreground"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - p.days);
                      setDateFrom(start.toISOString().split("T")[0]);
                      setDateTo(end.toISOString().split("T")[0]);
                      setPage(1);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active filter badges */}
        {(isFiltered || animalIdFilter) && (
          <div className="flex flex-wrap gap-1.5">
            {animalIdFilter && (
              <Badge
                variant="secondary"
                className="text-xs gap-1 inline-flex items-center"
              >
                <PawPrint size={10} />
                {filterAnimal?.name ?? `#${animalIdFilter}`}
                <button
                  onClick={() => setLocation("/historico")}
                  className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Limpar filtro de animal"
                >
                  <X size={10} />
                </button>
              </Badge>
            )}
            {stateFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1">
                {STATE_EMOJIS[stateFilter as EmotionalState]}{" "}
                {t(`states.${stateFilter}` as any) ||
                  STATE_LABELS[stateFilter as EmotionalState]}
              </Badge>
            )}
            {dateFrom && (
              <Badge variant="secondary" className="text-xs">
                {t("historyPage.dateFrom")}: {dateFrom}
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="text-xs">
                {t("historyPage.dateTo")}: {dateTo}
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-2">
                  <div className="bg-card border border-border rounded-2xl p-4 flex gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-secondary animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
                      <div className="h-3 w-48 rounded bg-secondary animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : queryError ? (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-4 shadow-lg text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-400">
                    {language === "pt" ? "Erro ao carregar histórico" : "Error loading history"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {language === "pt" ? "Falha ao comunicar com o servidor." : "Failed to communicate with the server."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refetchData()}
                  className="text-xs h-9 border-white/10 text-foreground hover:bg-white/5"
                >
                  <RefreshCw size={12} className="mr-1.5" />
                  {language === "pt" ? "Tentar novamente" : "Try again"}
                </Button>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl">
              <EmptyState filtered={isFiltered} />
            </div>
          ) : (
            Object.entries(groupEventsByDay(events, language)).map(([dateLabel, dayEvents]) => (
              <div key={dateLabel} className="space-y-2">
                <h3 className="text-sm font-bold text-muted-foreground px-2">{dateLabel}</h3>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  {dayEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      disabled={false}
                      isPlaying={playingEventId === event.id}
                      onPlayToggle={_handlePlayToggle}
                      onOpenRawData={() => setRawEvent(event)}
                      onFeedback={(eventId, feedback) => feedbackMutation.mutate({ eventId, feedback })}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <RawEventDialog
          event={rawEvent}
          onOpenChange={(open) => {
            if (!open) setRawEvent(null);
          }}
        />
      </div>
    </div>
  );
}
