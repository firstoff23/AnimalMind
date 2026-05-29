import { useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { useMotionValue, animate } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, PawPrint, Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { STATE_COLORS, STATE_EMOJIS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{payload[0]?.value}</p>
    </div>
  );
}

function ConfidenceTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
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
      }
    });
    return () => controls.stop();
  }, [value, count]);

  return <span ref={spanRef}>0</span>;
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: animals = [], isLoading: animalsLoading, error: animalsError, refetch: refetchAnimals } = trpc.animals.list.useQuery(undefined, { enabled: isAuthenticated });
  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];

  const utils = trpc.useUtils();
  const { data: invitations = [], refetch: refetchInvitations } = trpc.animals.getPendingInvitations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: familyMembers = [] } = trpc.family.getMembers.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false }
  );
  const familyId = familyMembers[0]?.familyId;

  const { data: familyActivity = [] } = trpc.family.getActivity.useQuery(
    undefined,
    { enabled: isAuthenticated && !!familyId, retry: false }
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

  const { data: events = [], refetch: refetchEvents } = trpc.animals.weeklyStats.useQuery(
    { animalId: activeAnimal?.id },
    { enabled: !!activeAnimal }
  );

  const { data: beliefState, refetch: refetchBelief } = trpc.animals.getBeliefState.useQuery(
    { animalId: activeAnimal?.id },
    { enabled: !!activeAnimal }
  );

  const handleRefresh = async () => {
    await Promise.all([
      refetchAnimals(),
      refetchInvitations(),
      activeAnimal ? refetchEvents() : Promise.resolve(),
      activeAnimal ? refetchBelief() : Promise.resolve(),
    ]);
  };

  const { pullDistance, isRefreshing, touchHandlers } = usePullToRefresh(handleRefresh);

  const dominantBelief = useMemo(() => {
    if (!beliefState) return null;
    const { relaxed, excitement, distress, hunger, alert, attention } = beliefState;
    const statesList = [
      { state: "relaxed", val: relaxed },
      { state: "excitement", val: excitement },
      { state: "distress", val: distress },
      { state: "hunger", val: hunger },
      { state: "alert", val: alert },
      { state: "attention", val: attention },
    ];
    return statesList.sort((a, b) => b.val - a.val)[0];
  }, [beliefState]);

  // ── Bar chart: state distribution ─────────────────────────────────────────
  const barData = useMemo(() => {
    const counts: Record<EmotionalState, number> = {
      distress: 0, attention: 0, excitement: 0,
      hunger: 0, alert: 0, relaxed: 0,
    };
    for (const e of events) {
      if (e.state in counts) counts[e.state as EmotionalState]++;
    }
    return STATES.map((s) => ({
      name: t("states." + s),
      value: counts[s],
      state: s,
      emoji: STATE_EMOJIS[s],
    }));
  }, [events, t]);

  // ── Line chart: daily average confidence ──────────────────────────────────
  const lineData = useMemo(() => {
    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const e of events) {
      const day = new Date(e.createdAt).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US", {
        weekday: "short",
      });
      if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
      byDay[day].sum += e.confidence;
      byDay[day].count++;
    }
    return Object.entries(byDay).map(([day, { sum, count }]) => ({
      day,
      avg: Math.round((sum / count) * 100) / 100,
    }));
  }, [events, language]);

  // ── Dominant state today ───────────────────────────────────────────────────
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayEvents = events.filter((e) => {
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
  }, [events]);

  return (
    <div 
      className="relative overflow-x-hidden min-h-full"
      {...touchHandlers}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-200 z-50"
        style={{ 
          top: `${pullDistance - 35}px`, 
          opacity: pullDistance > 15 ? 1 : 0 
        }}
      >
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Loader2 size={12} className={cn("text-primary", (isRefreshing || pullDistance >= 80) && "animate-spin")} />
          <span className="text-[10px] text-muted-foreground font-medium">
            {isRefreshing ? "A atualizar..." : pullDistance >= 80 ? "Solte para atualizar" : "Puxe para atualizar"}
          </span>
        </div>
      </div>

      <div 
        className="page-enter min-h-full px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none"
        }}
      >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("dashboardPage.title")}</h1>
        {activeAnimal && (
          <p className="text-sm text-muted-foreground">
            {activeAnimal.species === "dog" ? "🐕" : "🐈"} {activeAnimal.name} · {t("dashboardPage.last7Days")}
          </p>
        )}
      </div>

      {/* ─── 4 States: loading / error / empty / success ─── */}
      {animalsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl bg-slate-800" />
            <Skeleton className="h-24 rounded-2xl bg-slate-800" />
          </div>
          <Skeleton className="h-36 rounded-2xl bg-slate-800" />
          <Skeleton className="h-48 rounded-2xl bg-slate-800" />
        </div>
      ) : animalsError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm text-foreground font-semibold">Erro ao carregar dados do dashboard.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Falha ao comunicar com o servidor. Verifique a sua ligação e tente novamente.
          </p>
          <Button size="sm" onClick={() => refetchAnimals()} className="bg-primary text-primary-foreground rounded-xl">
            Tentar novamente
          </Button>
        </div>
      ) : animals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-secondary/10 border border-dashed border-border rounded-2xl p-6">
          <span className="text-5xl">🐾</span>
          <p className="text-foreground font-semibold">Ainda não tens animais.</p>
          <p className="text-muted-foreground text-sm">Adiciona o teu primeiro companheiro para começar a registar emoções.</p>
          <Link to="/perfil">
            <Button size="sm" className="bg-primary text-primary-foreground rounded-xl gap-1.5">
              <PawPrint size={14} /> + Adicionar animal
            </Button>
          </Link>
        </div>
      ) : (
        /* Stats Cards */
        <div className="grid grid-cols-2 gap-3">
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
        </div>
      )}

      {/* Pending Invitations Banner */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-gradient-to-r from-cyan-950/40 to-secondary/40 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3 page-enter"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">📩</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                    {t("dashboardPage.invitationTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {language === "pt" ? (
                      <>
                        <strong>{inv.ownerName}</strong> quer partilhar o perfil de{" "}
                        <strong>{inv.animalName}</strong> ({inv.animalSpecies === "dog" ? "cão" : "gato"}) contigo
                        como co-tutor (<strong>{inv.permission === "write" ? t("dashboardPage.permissionWrite") : t("dashboardPage.permissionRead")}</strong>).
                      </>
                    ) : (
                      <>
                        <strong>{inv.ownerName}</strong> wants to share <strong>{inv.animalName}</strong>'s profile
                        ({inv.animalSpecies === "dog" ? "dog" : "cat"}) with you as a co-guardian (
                        <strong>{inv.permission === "write" ? t("dashboardPage.permissionWrite") : t("dashboardPage.permissionRead")}</strong>).
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
        </div>
      )}

      {familyActivity.length > 0 && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              {t("dashboardPage.familyActivity")}
            </h2>
            <Link to="/family">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400">
                {t("dashboardPage.view")}
              </Button>
            </Link>
          </div>
          {familyActivity.slice(0, 3).map((item) => {
            const minutes = Math.max(1, Math.round((Date.now() - new Date(item.createdAt).getTime()) / 60000));
            const minLabel = minutes === 1 ? t("dashboardPage.minuteAgo") : t("dashboardPage.minutesAgo");
            return (
              <p key={item.id} className="text-xs text-muted-foreground">
                {item.message} {t("dashboardPage.ago")} {minutes} {minLabel}
              </p>
            );
          })}
        </div>
      )}

      {/* Animal selector */}
      {!animalsLoading && !animalsError && animals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {animals.map((a) => (
            <span
              key={a.id}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                a.isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span>{a.species === "dog" ? "🐕" : "🐈"} {a.name}</span>
              {a.isShared && (
                <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded-full uppercase font-semibold">
                  {language === "pt" ? "Co-tutor" : "Co-guardian"}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* All charts and detailed data - only show when data is loaded */}
      {!animalsLoading && !animalsError && animals.length > 0 && (
        <>
          {/* Dominant state card */}
          {todayStats ? (
            <div
              className="rounded-2xl p-4 border"
              style={{
                borderColor: STATE_COLORS[todayStats.state] + "44",
                background: STATE_COLORS[todayStats.state] + "11",
              }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {t("dashboardPage.dominantToday")}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{STATE_EMOJIS[todayStats.state]}</span>
                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: STATE_COLORS[todayStats.state] }}
                  >
                    {t("states." + todayStats.state)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayStats.pct}% {language === "pt" ? "das" : "of"} {todayStats.total} {todayStats.total === 1 ? (language === "pt" ? "classificação" : "classification") : (language === "pt" ? "classificações" : "classifications")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4 text-center text-muted-foreground text-sm">
              {t("dashboardPage.noClassToday")}
            </div>
          )}

          {/* POMDP Belief State - Humor Consolidado */}
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
                    <span className="text-3xl">{STATE_EMOJIS[dominantBelief.state as EmotionalState]}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("dashboardPage.stableMoodEstimated")}</p>
                      <p className="text-sm font-bold" style={{ color: STATE_COLORS[dominantBelief.state as EmotionalState] }}>
                        {t("states." + dominantBelief.state)} ({Math.round(dominantBelief.val * 100)}%)
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
                          <span className="text-muted-foreground flex items-center gap-1">
                            <span>{STATE_EMOJIS[s]}</span>
                            <span className="truncate">{t("states." + s)}</span>
                          </span>
                          <span className="font-semibold text-foreground">{Math.round(val * 100)}%</span>
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

          {/* Bar chart: state distribution */}
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
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
                  <XAxis
                    dataKey="emoji"
                    tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 16 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.17 0.012 264)" }} />
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

          {/* Line chart: daily average confidence */}
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
                <LineChart data={lineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
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

          {/* State legend */}
          <SpotlightCard>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("dashboardPage.legend")}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {STATES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-lg">{STATE_EMOJIS[s]}</span>
                  <span className="text-sm" style={{ color: STATE_COLORS[s] }}>
                    {t("states." + s)}
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </>
      )}
    </div>
    </div>
  );
}
