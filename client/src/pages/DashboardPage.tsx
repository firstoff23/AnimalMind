import { useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
import { STATE_LABELS, STATE_COLORS, STATE_EMOJIS } from "../../../shared/types";
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

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: animals = [] } = trpc.animals.list.useQuery();
  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];

  const utils = trpc.useUtils();
  const { data: invitations = [], refetch: refetchInvitations } = trpc.animals.getPendingInvitations.useQuery();

  const respondMutation = trpc.animals.respondToInvitation.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      refetchInvitations();
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro ao responder: ${err.message}`);
    },
  });

  const handleRespond = (invitationId: number, action: "accept" | "reject") => {
    respondMutation.mutate({ invitationId, action });
  };

  const { data: events = [] } = trpc.animals.weeklyStats.useQuery(
    { animalId: activeAnimal?.id },
    { enabled: !!activeAnimal }
  );

  const { data: beliefState } = trpc.animals.getBeliefState.useQuery(
    { animalId: activeAnimal?.id },
    { enabled: !!activeAnimal }
  );

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
      name: STATE_LABELS[s],
      value: counts[s],
      state: s,
      emoji: STATE_EMOJIS[s],
    }));
  }, [events]);

  // ── Line chart: daily average confidence ──────────────────────────────────
  const lineData = useMemo(() => {
    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const e of events) {
      const day = new Date(e.createdAt).toLocaleDateString("pt-PT", {
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
  }, [events]);

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
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        {activeAnimal && (
          <p className="text-sm text-muted-foreground">
            {activeAnimal.species === "dog" ? "🐕" : "🐈"} {activeAnimal.name} · últimos 7 dias
          </p>
        )}
      </div>

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
                    Convite de Co-tutoria
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    <strong>{inv.ownerName}</strong> quer partilhar o perfil de{" "}
                    <strong>{inv.animalName}</strong> ({inv.animalSpecies === "dog" ? "cão" : "gato"}) contigo
                    como co-tutor (<strong>{inv.permission === "write" ? "leitura/escrita" : "apenas leitura"}</strong>).
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
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond(inv.id, "reject")}
                  disabled={respondMutation.isPending}
                  className="flex-1 border-border hover:bg-secondary rounded-xl text-xs h-8 font-semibold"
                >
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Animal selector */}
      {animals.length > 1 && (
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
                  Co-tutor
                </span>
              )}
            </span>
          ))}
        </div>
      )}

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
            Estado dominante hoje
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{STATE_EMOJIS[todayStats.state]}</span>
            <div>
              <p
                className="text-lg font-bold"
                style={{ color: STATE_COLORS[todayStats.state] }}
              >
                {STATE_LABELS[todayStats.state]}
              </p>
              <p className="text-sm text-muted-foreground">
                {todayStats.pct}% das {todayStats.total} classificações
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 text-center text-muted-foreground text-sm">
          Sem classificações hoje
        </div>
      )}

      {/* POMDP Belief State - Humor Consolidado */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Humor Consolidado (POMDP)
          </h2>
          <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            Filtro Ativo
          </span>
        </div>

        {beliefState ? (
          <div className="space-y-3">
            {dominantBelief && (
              <div className="bg-secondary/20 p-3 rounded-xl border border-border/30 flex items-center gap-3">
                <span className="text-3xl">{STATE_EMOJIS[dominantBelief.state as EmotionalState]}</span>
                <div>
                  <p className="text-xs text-muted-foreground">Humor Estável Estimado</p>
                  <p className="text-sm font-bold" style={{ color: STATE_COLORS[dominantBelief.state as EmotionalState] }}>
                    {STATE_LABELS[dominantBelief.state as EmotionalState]} ({Math.round(dominantBelief.val * 100)}%)
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
                        <span className="truncate">{STATE_LABELS[s]}</span>
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
            A calcular crença probabilística...
          </div>
        )}

        <div className="pt-2 border-t border-border/50">
          <Link href="/veterinario">
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-semibold text-white shadow-md rounded-xl text-xs h-9">
              💼 Aceder ao Modo Veterinário
            </Button>
          </Link>
        </div>
      </div>

      {/* Bar chart: state distribution */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Distribuição de estados
        </h2>
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sem dados disponíveis
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
      </div>

      {/* Line chart: confidence evolution */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Confiança média diária
        </h2>
        {lineData.length < 2 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Dados insuficientes para o gráfico
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
      </div>

      {/* State legend */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Legenda
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {STATES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-lg">{STATE_EMOJIS[s]}</span>
              <span className="text-sm" style={{ color: STATE_COLORS[s] }}>
                {STATE_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
