import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { STATE_COLORS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

const PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

const ALL_STATES: EmotionalState[] = ["relaxed", "attention", "excitement", "hunger", "alert", "distress"];

const STATE_EMOJIS: Record<EmotionalState, string> = {
  relaxed: "⚪",
  attention: "🟡",
  excitement: "🟢",
  hunger: "🟠",
  alert: "🔵",
  distress: "🔴",
};

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ComparisonPage() {
  const { t, language } = useLanguage();
  const { data: animals = [] } = trpc.animals.list.useQuery();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const { data: listData } = trpc.events.list.useQuery(
    { pageSize: 1000 },
    { enabled: animals.length > 0 }
  );
  const eventsData = listData?.events ?? [];

  const toggleAnimal = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)
    );
  };

  const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
  const activeIds = selectedIds.length > 0 ? selectedIds : animals.slice(0, 2).map((a) => a.id);
  const activeAnimals = animals.filter((a) => activeIds.includes(a.id));

  // Count per animal per state
  const stateCounts: Record<number, Record<EmotionalState, number>> = {};
  activeAnimals.forEach((a) => {
    stateCounts[a.id] = { relaxed: 0, attention: 0, excitement: 0, hunger: 0, alert: 0, distress: 0 };
  });

  (eventsData as any[]).forEach((ev: any) => {
    if (!ev || !ev.animalId || !activeIds.includes(ev.animalId)) return;
    if (new Date(ev.createdAt) < cutoff) return;
    const st = ev.state as EmotionalState;
    if (stateCounts[ev.animalId] && ALL_STATES.includes(st)) {
      stateCounts[ev.animalId][st]++;
    }
  });

  // Build bar chart data (one bar group per state)
  const barData = ALL_STATES.map((state) => {
    const entry: Record<string, any> = {
      state: (language === "pt" ? t(`states.${state}` as any) : state) || state,
      emoji: STATE_EMOJIS[state],
    };
    activeAnimals.forEach((a) => {
      entry[a.name] = stateCounts[a.id]?.[state] ?? 0;
    });
    return entry;
  });

  // Build radar chart data per animal
  const radarData = ALL_STATES.map((state) => {
    const entry: Record<string, any> = {
      state: (language === "pt" ? t(`states.${state}` as any) : state) || state,
    };
    activeAnimals.forEach((a) => {
      const total = Object.values(stateCounts[a.id] ?? {}).reduce((s, v) => s + v, 0);
      entry[a.name] = total > 0 ? Math.round((stateCounts[a.id][state] / total) * 100) : 0;
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl">
        <p className="font-bold text-foreground mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
            <span className="font-semibold">{p.name}:</span> {p.value}
          </p>
        ))}
      </div>
    );
  };

  if (animals.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center pt-16 space-y-4">
        <PawPrint className="w-16 h-16 text-muted-foreground mx-auto opacity-50 animate-pulse" />
        <h1 className="text-2xl font-bold text-white">
          {language === "pt" ? "Sem Animais" : "No Animals"}
        </h1>
        <p className="text-slate-400">
          {language === "pt"
            ? "Adicione animais no Perfil para comparar dados emocionais."
            : "Add animals in Profile to compare emotional data."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-indigo-400" />
          {language === "pt" ? "Comparação de Animais" : "Animal Comparison"}
        </h1>
        <p className="text-slate-400 mt-1">
          {language === "pt"
            ? "Compare os estados emocionais dos seus animais"
            : "Compare emotional states across your animals"}
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 space-y-4">
          {/* Period selector */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value as 7 | 30 | 90)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === opt.value
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Animal selector (max 4) */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {language === "pt" ? "Selecionar animais (máx. 4):" : "Select animals (max 4):"}
            </p>
            <div className="flex flex-wrap gap-2">
              {animals.map((a, i) => {
                const isActive = activeIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAnimal(a.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      isActive
                        ? "text-white border-transparent shadow-md scale-105"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                    style={isActive ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
                  >
                    <PawPrint size={12} />
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {language === "pt" ? "Ocorrências por Estado Emocional" : "Occurrences by Emotional State"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="state"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
              />
              {activeAnimals.map((a, i) => (
                <Bar
                  key={a.id}
                  dataKey={a.name}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      {activeAnimals.length >= 2 && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {language === "pt" ? "Perfil Emocional (%)" : "Emotional Profile (%)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="state"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: "#64748b" }}
                />
                {activeAnimals.map((a, i) => (
                  <Radar
                    key={a.id}
                    name={a.name}
                    dataKey={a.name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {language === "pt" ? "Resumo" : "Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">
                    {language === "pt" ? "Estado" : "State"}
                  </th>
                  {activeAnimals.map((a, i) => (
                    <th
                      key={a.id}
                      className="text-center py-2 px-2 font-semibold"
                      style={{ color: COLORS[i % COLORS.length] }}
                    >
                      {a.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_STATES.map((state) => (
                  <tr key={state} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 text-foreground font-medium">
                      {STATE_EMOJIS[state]}{" "}
                      {(language === "pt" ? t(`states.${state}` as any) : state) || state}
                    </td>
                    {activeAnimals.map((a, i) => (
                      <td
                        key={a.id}
                        className="text-center py-2 px-2 tabular-nums font-semibold"
                        style={{ color: COLORS[i % COLORS.length] }}
                      >
                        {stateCounts[a.id]?.[state] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
