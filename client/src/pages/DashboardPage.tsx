import { animate, motion, useMotionValue } from "framer-motion";
import {
  AlertCircle,
  Apple,
  ChevronRight,
  Clock3,
  HeartPulse,
  Loader2,
  Mail,
  Mic,
  PawPrint,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Link } from "wouter";
import { AlertBanner } from "@/components/AlertBanner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { TrendCard } from "@/components/TrendCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { useAuth } from "@/contexts/AuthContext";
import { useMood } from "@/contexts/MoodContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { CACHE_KEYS, getCachedData, setCachedData } from "@/lib/offlineCache";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS } from "../../../shared/types";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

const formatDashboardTimestamp = (value: Date | string, locale: string) =>
  new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function getHealthBadge(state?: EmotionalState | string | null) {
  if (!state) {
    return {
      label: "Sem dados",
      className: "border-slate-700/70 bg-slate-800/70 text-slate-300",
    };
  }

  if (state === "distress" || state === "alert") {
    return {
      label: "Atenção",
      className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }

  if (state === "hunger" || state === "attention") {
    return {
      label: "Monitorizar",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "Estável",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{payload[0]?.value}</p>
    </div>
  );
}

function ConfidenceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary">
        {Math.round((payload[0]?.value ?? 0) * 100)}%
      </p>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    count.set(0);
    const controls = animate(count, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (spanRef.current) {
          spanRef.current.textContent = String(Math.round(latest));
        }
      },
    });
    return () => controls.stop();
  }, [value, count]);

  return <span ref={spanRef}>0</span>;
}
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { mood } = useMood();
  const { isAuthenticated } = useAuth();
  const {
    data: animals = [],
    isLoading: animalsLoading,
    error: animalsError,
    refetch: refetchAnimals,
  } = trpc.animals.list.useQuery(undefined, { enabled: isAuthenticated });

  const [cachedAnimals, setCachedAnimals] = useState<any[]>([]);
  const [cachedEvents, setCachedEvents] = useState<any[]>([]);
  const [cachedBeliefState, setCachedBeliefState] = useState<any>(null);

  useEffect(() => {
    getCachedData<any[]>(CACHE_KEYS.ANIMALS_LIST).then((data) => {
      if (data) setCachedAnimals(data);
    });
    getCachedData<any[]>(CACHE_KEYS.EVENTS_HISTORY).then((data) => {
      if (data) setCachedEvents(data);
    });
    getCachedData<any>("belief-state").then((data) => {
      if (data) setCachedBeliefState(data);
    });
  }, []);

  useEffect(() => {
    if (animals && animals.length > 0) {
      setCachedAnimals(animals);
      void setCachedData(CACHE_KEYS.ANIMALS_LIST, animals);
    }
  }, [animals]);

  const displayAnimals =
    animals && animals.length > 0 ? animals : cachedAnimals;
  const activeAnimal =
    displayAnimals.find((a) => a.isActive) ?? displayAnimals[0];

  const utils = trpc.useUtils();
  const { data: invitations = [], refetch: refetchInvitations } =
    trpc.animals.getPendingInvitations.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });

  const { data: familyMembers = [] } = trpc.family.getMembers.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false },
  );
  const familyId = familyMembers[0]?.familyId;

  const { data: familyActivity = [] } = trpc.family.getActivity.useQuery(
    undefined,
    { enabled: isAuthenticated && !!familyId, retry: false },
  );

  const respondMutation = trpc.animals.respondToInvitation.useMutation({
    onSuccess: () => {
      toast.success(t("dashboardPage.responseSuccess"));
      refetchInvitations();
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
    },
    onError: (err) => {
      toast.error(`${t("dashboardPage.responseError")} ${err.message}`);
    },
  });

  const handleRespond = (invitationId: number, action: "accept" | "reject") => {
    respondMutation.mutate({ invitationId, action });
  };

  const { data: events = [], refetch: refetchEvents } =
    trpc.animals.weeklyStats.useQuery(
      { animalId: activeAnimal?.id },
      { enabled: !!activeAnimal },
    );

  const { data: beliefState, refetch: refetchBelief } =
    trpc.animals.getBeliefState.useQuery(
      { animalId: activeAnimal?.id },
      { enabled: !!activeAnimal },
    );

  useEffect(() => {
    if (events && events.length > 0) {
      setCachedEvents(events);
      void setCachedData(CACHE_KEYS.EVENTS_HISTORY, events);
    }
  }, [events]);

  useEffect(() => {
    if (beliefState) {
      setCachedBeliefState(beliefState);
      void setCachedData("belief-state", beliefState);
    }
  }, [beliefState]);

  const displayEvents = events && events.length > 0 ? events : cachedEvents;
  const displayBeliefState = beliefState || cachedBeliefState;

  const handleRefresh = async () => {
    await Promise.all([
      refetchAnimals(),
      refetchInvitations(),
      activeAnimal ? refetchEvents() : Promise.resolve(),
      activeAnimal ? refetchBelief() : Promise.resolve(),
    ]);
  };

  const { pullDistance, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh);

  const dominantBelief = useMemo(() => {
    if (!displayBeliefState) return null;
    const { relaxed, excitement, distress, hunger, alert, attention } =
      displayBeliefState;
    const statesList = [
      { state: "relaxed", val: relaxed },
      { state: "excitement", val: excitement },
      { state: "distress", val: distress },
      { state: "hunger", val: hunger },
      { state: "alert", val: alert },
      { state: "attention", val: attention },
    ];
    return statesList.sort((a, b) => b.val - a.val)[0];
  }, [displayBeliefState]);

  // ── Bar chart: state distribution ─────────────────────────────────────────
  const barData = useMemo(() => {
    const counts: Record<EmotionalState, number> = {
      distress: 0,
      attention: 0,
      excitement: 0,
      hunger: 0,
      alert: 0,
      relaxed: 0,
    };
    for (const e of displayEvents) {
      if (e.state in counts) counts[e.state as EmotionalState]++;
    }
    return STATES.map((s) => ({
      name: t(`states.${s}`),
      value: counts[s],
      state: s,
      color: STATE_COLORS[s],
    }));
  }, [displayEvents, t]);

  // ── Line chart: daily average daily confidence ──────────────────────────────
  const lineData = useMemo(() => {
    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const e of displayEvents) {
      const day = new Date(e.createdAt).toLocaleDateString(
        language === "pt" ? "pt-PT" : "en-US",
        {
          weekday: "short",
        },
      );
      if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
      byDay[day].sum += e.confidence;
      byDay[day].count++;
    }
    return Object.entries(byDay).map(([day, { sum, count }]) => ({
      day,
      avg: Math.round((sum / count) * 100) / 100,
    }));
  }, [displayEvents, language]);

  // ── Dominant state today ───────────────────────────────────────────────────
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayEvents = displayEvents.filter((e) => {
      const d = new Date(e.createdAt);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });
    if (todayEvents.length === 0) return null;

    const counts: Record<string, number> = {};
    for (const e of todayEvents) {
      counts[e.state] = (counts[e.state] ?? 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!dominant) return null;
    const [state, count] = dominant;
    return {
      state: state as EmotionalState,
      pct: Math.round((count / todayEvents.length) * 100),
      total: todayEvents.length,
    };
  }, [displayEvents]);

  const latestEvent = useMemo(() => {
    return (
      [...displayEvents].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null
    );
  }, [displayEvents]);

  const activeAnimalHealth = getHealthBadge(latestEvent?.state);
  const locale = language === "pt" ? "pt-PT" : "en-US";

  if (animalsLoading) {
    return (
      <div className="relative min-h-full overflow-x-hidden" {...touchHandlers}>
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
          }}
        >
          <AppShellSkeleton mode="content" variant="dashboard" />
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="min-h-full px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.75rem] border bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] transition-all duration-500",
              mood === "calm"
                ? "border-mood-primary/15"
                : mood === "concerned"
                  ? "border-mood-primary/25"
                  : "border-mood-primary/15",
            )}
            style={{
              boxShadow: `0 8px 30px rgba(var(--mood-color-rgb), 0.05)`,
            }}
          >
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-mood-primary/10 blur-3xl transition-all duration-500" />
            <div className="absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-mood-primary/5 blur-3xl transition-all duration-500" />

            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {activeAnimal && (
                    <motion.div
                      animate={{
                        scale:
                          mood === "calm"
                            ? [1, 1.03, 1]
                            : mood === "concerned"
                              ? [1, 1.06, 1]
                              : [1, 1.04, 1],
                        boxShadow:
                          mood === "calm"
                            ? [
                                "0 0 0 0px rgba(52, 168, 83, 0.2)",
                                "0 0 0 8px rgba(52, 168, 83, 0)",
                                "0 0 0 0px rgba(52, 168, 83, 0)",
                              ]
                            : mood === "concerned"
                              ? [
                                  "0 0 0 0px rgba(244, 180, 0, 0.4)",
                                  "0 0 0 12px rgba(244, 180, 0, 0)",
                                  "0 0 0 0px rgba(244, 180, 0, 0)",
                                ]
                              : [
                                  "0 0 0 0px rgba(66, 133, 244, 0.3)",
                                  "0 0 0 10px rgba(66, 133, 244, 0)",
                                  "0 0 0 0px rgba(66, 133, 244, 0)",
                                ],
                      }}
                      transition={{
                        duration:
                          mood === "calm"
                            ? 3.0
                            : mood === "concerned"
                              ? 1.2
                              : 2.0,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="rounded-full shrink-0"
                    >
                      <Avatar className="h-14 w-14 border border-mood-primary/30 bg-black/20">
                        <AvatarImage
                          src={
                            "photoUrl" in activeAnimal &&
                            typeof activeAnimal.photoUrl === "string"
                              ? activeAnimal.photoUrl
                              : undefined
                          }
                          alt={activeAnimal.name}
                        />
                        <AvatarFallback className="bg-mood-primary/10 text-xl">
                          <PawPrint
                            size={22}
                            className="text-mood-primary/60"
                          />
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-mood-primary/80 transition-all duration-500">
                      Pawra
                    </p>
                    <h1 className="mt-0.5 text-2xl font-bold text-foreground">
                      {t("dashboardPage.title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground leading-snug">
                      {activeAnimal
                        ? mood === "calm"
                          ? language === "pt"
                            ? `O ${activeAnimal.name} está bem hoje`
                            : `${activeAnimal.name} is doing well today`
                          : mood === "concerned"
                            ? language === "pt"
                              ? `O ${activeAnimal.name} pode precisar de atenção — vê os detalhes`
                              : `${activeAnimal.name} might need attention — see details`
                            : language === "pt"
                              ? `Sem novidades com o ${activeAnimal.name}`
                              : `No updates for ${activeAnimal.name}`
                        : language === "pt"
                          ? "Comece por adicionar o seu primeiro animal."
                          : "Start by adding your first animal."}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold shrink-0",
                    activeAnimalHealth.className,
                  )}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {activeAnimalHealth.label}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <Link to="/gravar">
                  <Button className="h-auto w-full justify-between rounded-2xl bg-[var(--color-primary)] px-4 py-4 text-left text-white shadow-[var(--shadow-glow)] hover:bg-emerald-500 active-scale tap-highlight-none">
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/20">
                        <Mic className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold">
                          {language === "pt" ? "Gravar agora" : "Record now"}
                        </span>
                        <span className="block text-[11px] font-medium text-white/75">
                          {language === "pt"
                            ? "Classificação em segundos"
                            : "Classification in seconds"}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                    {language === "pt" ? "Última gravação" : "Last recording"}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {latestEvent
                      ? t(`states.${latestEvent.state as EmotionalState}`)
                      : language === "pt"
                        ? "Sem gravações ainda"
                        : "No recordings yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {latestEvent
                      ? formatDashboardTimestamp(latestEvent.createdAt, locale)
                      : language === "pt"
                        ? "A primeira análise aparece aqui."
                        : "The first analysis appears here."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-3 select-none"
        >
          <Link to="/alimentos">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl justify-start gap-2.5 border-border/60 hover:bg-muted/40 text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              <Apple className="h-4.5 w-4.5 text-emerald-400" />
              <span>{language === "pt" ? "Alimentos" : "Foods"}</span>
            </Button>
          </Link>
          <Link to="/historico">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl justify-start gap-2.5 border-border/60 hover:bg-muted/40 text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              <Clock3 className="h-4.5 w-4.5 text-indigo-400" />
              <span>{language === "pt" ? "Histórico" : "History"}</span>
            </Button>
          </Link>
        </motion.div>

        {activeAnimal && (
          <motion.div variants={itemVariants}>
            <AlertBanner animalId={activeAnimal.id} />
          </motion.div>
        )}

        {!animalsLoading && !animalsError && displayAnimals.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                {language === "pt" ? "Animais acompanhados" : "Tracked animals"}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {displayAnimals.length}
              </span>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {displayAnimals.map((a) => {
                const isActiveAnimal = a.id === activeAnimal?.id;
                const status = getHealthBadge(
                  isActiveAnimal ? latestEvent?.state : null,
                );
                const photoUrl =
                  "photoUrl" in a && typeof a.photoUrl === "string"
                    ? a.photoUrl
                    : undefined;
                return (
                  <Link key={a.id} to={`/animal/${a.id}`}>
                    <div
                      className={cn(
                        "min-w-[210px] rounded-2xl border p-3 transition-all active-scale tap-highlight-none",
                        isActiveAnimal
                          ? "border-mood-primary/35 bg-mood-primary/10 shadow-[0_4px_20px_rgba(var(--mood-color-rgb),0.06)]"
                          : "border-border/70 bg-[var(--color-surface)]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {isActiveAnimal ? (
                            <motion.div
                              animate={{
                                scale:
                                  mood === "calm"
                                    ? [1, 1.04, 1]
                                    : mood === "concerned"
                                      ? [1, 1.08, 1]
                                      : [1, 1.06, 1],
                              }}
                              transition={{
                                duration:
                                  mood === "calm"
                                    ? 3.0
                                    : mood === "concerned"
                                      ? 1.2
                                      : 2.0,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              <Avatar className="h-12 w-12 border border-mood-primary/35 bg-black/20">
                                <AvatarImage src={photoUrl} alt={a.name} />
                                <AvatarFallback className="bg-mood-primary/10 text-lg">
                                  <PawPrint
                                    size={18}
                                    className="text-mood-primary/60"
                                  />
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                          ) : (
                            <Avatar className="h-12 w-12 border border-white/10 bg-black/20">
                              <AvatarImage src={photoUrl} alt={a.name} />
                              <AvatarFallback className="bg-emerald-500/10 text-lg">
                                <PawPrint
                                  size={18}
                                  className="text-emerald-500/60"
                                />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">
                            {a.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {a.breed ||
                              (language === "pt"
                                ? "Raça não definida"
                                : "Breed not set")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[10px] font-semibold",
                            status.className,
                          )}
                        >
                          <HeartPulse className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── 4 States: error / empty / success ─── */}
        {animalsError ? (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake"
          >
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-sm text-foreground font-semibold">
              Erro ao carregar dados do dashboard.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Falha ao comunicar com o servidor. Verifique a sua ligação e tente
              novamente.
            </p>
            <Button
              size="sm"
              onClick={() => refetchAnimals()}
              className="bg-primary text-primary-foreground rounded-xl"
            >
              Tentar novamente
            </Button>
          </motion.div>
        ) : displayAnimals.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center py-12 text-center space-y-8 bg-slate-900/30 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm max-w-lg mx-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
              <Sparkles className="w-12 h-12 text-indigo-400 relative" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">
                Bem-vindo ao Pawra!
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed">
                Vamos configurar a sua conta. Siga os passos rápidos abaixo para
                começar a monitorizar o seu companheiro.
              </p>
            </div>

            <div className="w-full space-y-4 text-left">
              {/* Step 1 */}
              <div className="flex gap-4 items-center bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 transition-all duration-300">
                <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-200">
                    Adicionar o Seu Primeiro Animal
                  </h4>
                  <p className="text-[11px] text-indigo-300">
                    Crie o perfil com espécie, raça e idade do seu companheiro.
                  </p>
                </div>
                <Link to="/definicoes">
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-3.5 shadow-md"
                  >
                    Criar Perfil
                  </Button>
                </Link>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-center bg-slate-900/40 border border-slate-900 rounded-2xl p-4 opacity-50">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-400">
                    Gravar uma Vocalização
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Capte o áudio do seu animal no gravador para obter o
                    relatório de bem-estar.
                  </p>
                </div>
                <span className="text-slate-500 text-xs">Aguardando</span>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-center bg-slate-900/40 border border-slate-900 rounded-2xl p-4 opacity-50">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-400">
                    Analisar Tendências
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Aceda a estatísticas semanais e alertas automáticos de
                    alteração comportamental.
                  </p>
                </div>
                <span className="text-slate-500 text-xs">Aguardando</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Stats Cards */
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-3"
          >
            <SpotlightCard className="flex flex-col items-center justify-center p-4 text-center">
              <span className="text-2xl font-bold text-primary">
                <AnimatedNumber value={events.length} />
              </span>
              <span className="text-xs text-muted-foreground mt-1 font-medium">
                {t("dashboardPage.statsRecordings")}
              </span>
            </SpotlightCard>
            <SpotlightCard className="flex flex-col items-center justify-center p-4 text-center">
              <span className="text-2xl font-bold text-primary">
                <AnimatedNumber value={animals.length} />
              </span>
              <span className="text-xs text-muted-foreground mt-1 font-medium">
                {t("dashboardPage.statsAnimals")}
              </span>
            </SpotlightCard>
          </motion.div>
        )}

        {/* Pending Invitations Banner */}
        {invitations.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-cyan-950/40 to-secondary/40 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3 page-enter"
              >
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                      {t("dashboardPage.invitationTitle")}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {language === "pt" ? (
                        <>
                          <strong>{inv.ownerName}</strong> quer partilhar o
                          perfil de <strong>{inv.animalName}</strong> (
                          {inv.animalSpecies === "dog" ? "cão" : "gato"})
                          contigo como co-tutor (
                          <strong>
                            {inv.permission === "write"
                              ? t("dashboardPage.permissionWrite")
                              : t("dashboardPage.permissionRead")}
                          </strong>
                          ).
                        </>
                      ) : (
                        <>
                          <strong>{inv.ownerName}</strong> wants to share{" "}
                          <strong>{inv.animalName}</strong>'s profile (
                          {inv.animalSpecies === "dog" ? "dog" : "cat"}) with
                          you as a co-guardian (
                          <strong>
                            {inv.permission === "write"
                              ? t("dashboardPage.permissionWrite")
                              : t("dashboardPage.permissionRead")}
                          </strong>
                          ).
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRespond(inv.id, "accept")}
                    disabled={respondMutation.isPending}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs h-8 font-semibold"
                  >
                    {t("dashboardPage.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespond(inv.id, "reject")}
                    disabled={respondMutation.isPending}
                    className="flex-1 border-border hover:bg-secondary rounded-xl text-xs h-8 font-semibold"
                  >
                    {t("dashboardPage.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {familyActivity.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                {t("dashboardPage.familyActivity")}
              </h2>
              <Link to="/family">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-emerald-400"
                >
                  {t("dashboardPage.view")}
                </Button>
              </Link>
            </div>
            {familyActivity.slice(0, 3).map((item) => {
              const minutes = Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(item.createdAt).getTime()) / 60000,
                ),
              );
              const minLabel =
                minutes === 1
                  ? t("dashboardPage.minuteAgo")
                  : t("dashboardPage.minutesAgo");
              return (
                <p key={item.id} className="text-xs text-muted-foreground">
                  {item.message} {t("dashboardPage.ago")} {minutes} {minLabel}
                </p>
              );
            })}
          </motion.div>
        )}

        {/* Animal selector */}
        {!animalsLoading && !animalsError && animals.length > 1 && (
          <motion.div
            variants={itemVariants}
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          >
            {animals.map((a) => (
              <span
                key={a.id}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  a.isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <PawPrint size={11} className="flex-shrink-0" />
                  {a.name}
                </span>
                {a.isShared && (
                  <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded-full uppercase font-semibold">
                    {language === "pt" ? "Co-tutor" : "Co-guardian"}
                  </span>
                )}
              </span>
            ))}
          </motion.div>
        )}

        {/* All charts and detailed data - only show when data is loaded */}
        {!animalsLoading && !animalsError && animals.length > 0 && (
          <div className="space-y-5 flex flex-col">
            <motion.div variants={itemVariants}>
              <TrendCard animalId={activeAnimal.id} />
            </motion.div>

            {/* Dominant state card */}
            {todayStats ? (
              <motion.div
                variants={itemVariants}
                className="rounded-2xl p-4 border"
                style={{
                  borderColor: `${STATE_COLORS[todayStats.state]}44`,
                  background: `${STATE_COLORS[todayStats.state]}11`,
                }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  {t("dashboardPage.dominantToday")}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `${STATE_COLORS[todayStats.state]}33`,
                      border: `2px solid ${STATE_COLORS[todayStats.state]}55`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        backgroundColor: `${STATE_COLORS[todayStats.state]}88`,
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: STATE_COLORS[todayStats.state] }}
                    >
                      {t(`states.${todayStats.state}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {todayStats.pct}% {language === "pt" ? "das" : "of"}{" "}
                      {todayStats.total}{" "}
                      {todayStats.total === 1
                        ? language === "pt"
                          ? "classificação"
                          : "classification"
                        : language === "pt"
                          ? "classificações"
                          : "classifications"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                variants={itemVariants}
                className="bg-card border border-border rounded-2xl p-4 text-center text-muted-foreground text-sm"
              >
                {t("dashboardPage.noClassToday")}
              </motion.div>
            )}

            {/* POMDP Belief State - Humor Consolidado */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("dashboardPage.consolidatedMood")}
                  </h2>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                    {t("dashboardPage.activeFilter")}
                  </span>
                </div>

                {beliefState ? (
                  <div className="space-y-3">
                    {dominantBelief && (
                      <div className="bg-secondary/20 p-3 rounded-xl border border-border/30 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: `${
                              STATE_COLORS[
                                dominantBelief.state as EmotionalState
                              ]
                            }22`,
                            border: `2px solid ${STATE_COLORS[dominantBelief.state as EmotionalState]}44`,
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor:
                                STATE_COLORS[
                                  dominantBelief.state as EmotionalState
                                ],
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("dashboardPage.stableMoodEstimated")}
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{
                              color:
                                STATE_COLORS[
                                  dominantBelief.state as EmotionalState
                                ],
                            }}
                          >
                            {t(`states.${dominantBelief.state}`)} (
                            {Math.round(dominantBelief.val * 100)}%)
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
                      {STATES.map((s) => {
                        const val = (beliefState as any)[s] || 0;
                        return (
                          <div key={s} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: STATE_COLORS[s] }}
                                />
                                <span className="truncate">
                                  {t(`states.${s}`)}
                                </span>
                              </span>
                              <span className="font-semibold text-foreground">
                                {Math.round(val * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${val * 100}%`,
                                  backgroundColor: STATE_COLORS[s],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    {t("dashboardPage.calculatingBelief")}
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/veterinario">
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-semibold text-white shadow-md rounded-xl text-xs h-9">
                        {t("dashboardPage.accessVetMode")}
                      </Button>
                    </Link>
                    <Link href="/family">
                      <Button className="w-full bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-xl text-xs h-9">
                        {t("dashboardPage.family")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bar chart: state distribution */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("dashboardPage.statesDistributionTitle")}
                </h2>
                {events.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    {t("dashboardPage.noDataAvailable")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={barData}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 264)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={36}
                      />
                      <YAxis
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "oklch(0.17 0.012 264)" }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {barData.map((entry) => (
                          <Cell
                            key={entry.state}
                            fill={STATE_COLORS[entry.state]}
                            fillOpacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SpotlightCard>
            </motion.div>

            {/* Line chart: daily average confidence */}
            <motion.div variants={itemVariants}>
              <SpotlightCard className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("dashboardPage.avgConfidence")}
                </h2>
                {lineData.length < 2 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    {t("dashboardPage.insufficientDataChart")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart
                      data={lineData}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 264)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0.5, 1]}
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${Math.round(v * 100)}%`}
                      />
                      <Tooltip content={<ConfidenceTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </SpotlightCard>
            </motion.div>

            {/* State legend */}
            <motion.div variants={itemVariants}>
              <SpotlightCard>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {t("dashboardPage.legend")}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {STATES.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATE_COLORS[s] }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: STATE_COLORS[s] }}
                      >
                        {t(`states.${s}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
