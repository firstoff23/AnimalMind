import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Activity,
  History,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  FileText,
  Save,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import {
  STATE_LABELS,
  STATE_COLORS,
  STATE_EMOJIS,
} from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";
import { cn } from "@/lib/utils";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

export default function AnimalDetailPage({ params }: { params: { id: string } }) {
  const animalId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"stats" | "baseline" | "history">("stats");
  const [statsDays, setStatsDays] = useState<7 | 30>(7);
  const [historyPage, setHistoryPage] = useState(1);
  const [editingNotesEventId, setEditingNotesEventId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: animal, isLoading: loadingAnimal, error: animalError } = trpc.animals.get.useQuery(
    { animalId }
  );

  useEffect(() => {
    if (animalError) {
      toast.error("Animal não encontrado ou não autorizado.");
      setLocation("/perfil");
    }
  }, [animalError, setLocation]);

  const { data: baseline, isLoading: loadingBaseline } = trpc.animals.getBaseline.useQuery(
    { animalId }
  );

  const { data: stats, isLoading: loadingStats } = trpc.events.statsForAnimal.useQuery(
    { animalId, days: statsDays }
  );

  const { data: historyRes, isLoading: loadingHistory } = trpc.events.listForAnimal.useQuery(
    { animalId, page: historyPage, pageSize: 8 }
  );

  // Mutations
  const updateBaselineMutation = trpc.animals.updateBaseline.useMutation({
    onSuccess: () => {
      toast.success("Baseline comportamental atualizada com sucesso!");
      utils.animals.getBaseline.invalidate({ animalId });
      utils.events.statsForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error("Erro ao atualizar baseline."),
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => {
      utils.events.listForAnimal.invalidate({ animalId });
      utils.events.statsForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error("Erro ao guardar feedback."),
  });

  const updateNotesMutation = trpc.events.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Notas guardadas!");
      setEditingNotesEventId(null);
      utils.events.listForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error("Erro ao guardar notas."),
  });

  // State distribution calculations
  const radarData = useMemo(() => {
    if (!stats) return [];
    return STATES.map((s) => ({
      state: STATE_LABELS[s],
      value: stats.stateDistribution[s] || 0,
      fullMark: Math.max(...Object.values(stats.stateDistribution), 1),
    }));
  }, [stats]);

  // Audio playing handler
  const handlePlayToggle = (eventId: number, audioUrl: string) => {
    if (playingAudioId === eventId) {
      audioElement?.pause();
      setPlayingAudioId(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
      setAudioElement(audio);
      setPlayingAudioId(eventId);
    }
  };

  // PDF report generation
  const handleExportPdf = () => {
    if (!animal || !baseline || !stats) return;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Colors
      const primaryColor = [16, 185, 129]; // Emerald (10B981)
      const textColor = [30, 41, 59]; // Slate 800
      const lightTextColor = [100, 116, 139]; // Slate 500

      // Title & Header
      doc.setFillColor(248, 250, 252); // Light background
      doc.rect(0, 0, 210, 45, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("AnimalMind 🐾 - Relatório Clínico", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 15, 28);
      doc.text(`Código do Animal: #${animal.id}`, 15, 34);

      // Horizontal separator
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 45, 195, 45);

      // Animal Info Card
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Identificação do Animal", 15, 55);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Nome: ${animal.name}`, 15, 63);
      doc.text(`Espécie: ${animal.species === "dog" ? "Cão 🐕" : "Gato 🐈"}`, 15, 70);
      doc.text(`Raça: ${animal.breed ?? "Desconhecida"}`, 110, 63);
      doc.text(`Idade: ${animal.age !== null ? `${animal.age} anos` : "—"}`, 110, 70);

      // Baseline parameters
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Baseline Comportamental (Calibração)", 15, 85);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Sensibilidade de Alertas: ${baseline.alertSensitivity.toUpperCase()}`, 15, 93);
      doc.text(`Limiar de Vocalizações: ${baseline.vocalizationThreshold} por dia`, 15, 100);
      
      const normalStatesText = baseline.normalStates
        .map((s) => STATE_LABELS[s as EmotionalState] || s)
        .join(", ");
      doc.text(`Estados Típicos/Normais: ${normalStatesText || "Nenhum"}`, 15, 107);

      // Stats Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Estatísticas Acústicas (Últimos ${statsDays} dias)`, 15, 122);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Total de vocalizações registadas: ${stats.totalCount}`, 15, 130);

      // Find dominant state
      let maxCount = 0;
      let dominant = "Relaxado";
      Object.entries(stats.stateDistribution).forEach(([st, cnt]) => {
        if ((cnt as number) > maxCount) {
          maxCount = cnt as number;
          dominant = STATE_LABELS[st as EmotionalState] || st;
        }
      });
      doc.text(`Estado dominante no período: ${dominant} (${maxCount} ocorrências)`, 15, 137);

      // Table Header for Recent events
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 150, 180, 8, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text("Data e Hora", 18, 155);
      doc.text("Estado Traduzido", 65, 155);
      doc.text("Confiança", 110, 155);
      doc.text("Modelo", 135, 155);
      doc.text("Notas", 165, 155);

      // Table Rows
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      const eventsList = historyRes?.events || [];
      const tableLimit = Math.min(eventsList.length, 10);

      for (let i = 0; i < tableLimit; i++) {
        const ev = eventsList[i];
        const y = 164 + i * 8;

        // Alternating row background
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y - 5, 180, 8, "F");
        }

        const dateStr = new Date(ev.createdAt).toLocaleString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        doc.text(dateStr, 18, y);
        doc.text(STATE_LABELS[ev.state as EmotionalState] || ev.state, 65, y);
        doc.text(`${Math.round(Number(ev.confidence) * 100)}%`, 110, y);
        doc.text(ev.modelUsed || "yamnet", 135, y);
        
        const noteExcerpt = ev.notes 
          ? (ev.notes.length > 15 ? ev.notes.substring(0, 12) + "..." : ev.notes) 
          : "—";
        doc.text(noteExcerpt, 165, y);
      }

      // Footer
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text("AnimalMind 🐾 — Monitorização de Bem-Estar Animal em Tempo Real", 15, 275);
      doc.text("Relatório confidencial gerado pelo tutor.", 15, 280);

      doc.save(`relatorio_${animal.name}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório PDF descarregado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório PDF.");
    }
  };

  // Submit Baseline configuration
  const handleBaselineSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!baseline) return;
    
    const formData = new FormData(e.currentTarget);
    const vocalizationThreshold = parseInt(formData.get("vocalizationThreshold") as string);
    const alertSensitivity = formData.get("alertSensitivity") as ("low" | "medium" | "high");

    const checkedNormalStates: string[] = [];
    STATES.forEach((s) => {
      if (formData.get(`normalState_${s}`) === "on") {
        checkedNormalStates.push(s);
      }
    });

    updateBaselineMutation.mutate({
      animalId,
      vocalizationThreshold,
      alertSensitivity,
      normalStates: checkedNormalStates,
    });
  };

  if (loadingAnimal || loadingBaseline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm">A carregar detalhes do animal...</p>
      </div>
    );
  }

  if (!animal || !baseline) return null;

  // Anomaly check based on baseline settings
  // Anomaly is defined as a distress/alert state vocalization, OR a state that is NOT in the animal's typical states list
  const recentEvents = historyRes?.events || [];
  const anomalyAlerts = recentEvents.filter((ev) => {
    const isNormal = baseline.normalStates.includes(ev.state);
    const isThreatState = ev.state === "distress" || ev.state === "alert";
    return !isNormal || isThreatState;
  });

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-20 max-w-xl mx-auto space-y-6">
      {/* Header and Back navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/perfil")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Download size={15} /> Descarregar PDF
        </Button>
      </div>

      {/* Animal Identity Header */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-slate-900 opacity-20 text-8xl pointer-events-none select-none font-bold">
          {animal.species === "dog" ? "DOG" : "CAT"}
        </div>

        <div className="text-5xl bg-secondary/80 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner z-10">
          {animal.species === "dog" ? "🐕" : "🐈"}
        </div>
        <div className="z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{animal.name}</h1>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-none capitalize text-[10px] px-2 py-0.5">
              {animal.species === "dog" ? "Cão" : "Gato"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {animal.breed || "Sem raça definida"} • {animal.age !== null ? `${animal.age} anos` : "Idade desconhecida"}
          </p>
        </div>
      </div>

      {/* Anomaly banner if alerts exist */}
      {anomalyAlerts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start page-enter">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wide">
              Alertas Recentes (Fuga de Baseline)
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Foram detetados {anomalyAlerts.length} eventos fora dos parâmetros típicos ou de angústia no histórico recente.
            </p>
          </div>
        </div>
      )}

      {/* Glassmorphic Tab switcher */}
      <div className="flex bg-secondary/60 p-1 rounded-xl border border-border/80">
        {(["stats", "baseline", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "stats" && <Activity size={13} />}
            {tab === "baseline" && <Settings size={13} />}
            {tab === "history" && <History size={13} />}
            {tab === "stats" && "Estatísticas"}
            {tab === "baseline" && "Calibrar"}
            {tab === "history" && "Histórico"}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-6 page-enter">
            {/* Days switcher */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Métricas de Saúde Emocional
              </h2>
              <div className="flex bg-secondary rounded-lg p-0.5 text-[10px]">
                {([7, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setStatsDays(d);
                      utils.events.statsForAnimal.invalidate({ animalId, days: d });
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      statsDays === d ? "bg-background text-foreground font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            </div>

            {loadingStats ? (
              <div className="h-48 flex items-center justify-center bg-card border border-border rounded-2xl">
                <span className="text-xs text-muted-foreground">A carregar métricas...</span>
              </div>
            ) : !stats || stats.totalCount === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
                <span className="text-4xl block">📊</span>
                <p className="text-sm font-semibold text-foreground">Sem dados suficientes</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Faça a primeira gravação do seu animal para ver as estatísticas acústicas e evolução de confiança.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {/* 1. Radar distribution */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Distribuição Emocional Detalhada
                  </h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="oklch(0.22 0.012 264)" />
                        <PolarAngleAxis
                          dataKey="state"
                          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
                        />
                        <Radar
                          name="Ocorrências"
                          dataKey="value"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.25}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "oklch(0.12 0.012 264)",
                            border: "1px solid oklch(0.22 0.012 264)",
                            borderRadius: "8px",
                            color: "oklch(0.97 0.003 264)",
                            fontSize: 10,
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Confidence Trend */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tendência de Confiança de Classificação
                  </h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }}
                          tickFormatter={(str) => str.split("-")[2]}
                        />
                        <YAxis
                          domain={[0, 1]}
                          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }}
                          tickFormatter={(val) => `${Math.round(val * 100)}%`}
                        />
                        <Tooltip
                          formatter={(value) => [`${Math.round(Number(value) * 100)}%`, "Média Confiança"]}
                          contentStyle={{
                            background: "oklch(0.12 0.012 264)",
                            border: "1px solid oklch(0.22 0.012 264)",
                            borderRadius: "8px",
                            color: "oklch(0.97 0.003 264)",
                            fontSize: 11,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgConfidence"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Daily vocalizations vs Baseline target */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between items-center">
                    <span>Atividade Acústica Diária</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500">
                      Limite Baseline: {baseline.vocalizationThreshold}
                    </Badge>
                  </h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }}
                          tickFormatter={(str) => str.split("-")[2]}
                        />
                        <YAxis tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }} />
                        <Tooltip
                          formatter={(value) => [value, "Vocalizações"]}
                          contentStyle={{
                            background: "oklch(0.12 0.012 264)",
                            border: "1px solid oklch(0.22 0.012 264)",
                            borderRadius: "8px",
                            color: "oklch(0.97 0.003 264)",
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <ReferenceLine
                          y={baseline.vocalizationThreshold}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{
                            value: "Alerta",
                            fill: "#ef4444",
                            fontSize: 9,
                            position: "top",
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BASELINE TAB (CALIBRATION) */}
        {activeTab === "baseline" && (
          <form onSubmit={handleBaselineSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-5 page-enter">
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles size={16} className="text-primary animate-pulse" /> Calibração Comportamental
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste os parâmetros padrão para calibrar o tradutor com a personalidade individual do seu animal de estimação.
              </p>
            </div>

            <div className="space-y-4">
              {/* Vocalization Threshold */}
              <div className="space-y-1">
                <Label htmlFor="vocalizationThreshold" className="text-xs font-semibold text-muted-foreground">
                  Limiar Diário de Vocalizações (Alertas de Ruído)
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="number"
                    id="vocalizationThreshold"
                    name="vocalizationThreshold"
                    defaultValue={baseline.vocalizationThreshold}
                    min={1}
                    max={100}
                    className="bg-secondary border-border w-24 text-center font-bold"
                  />
                  <span className="text-xs text-muted-foreground">
                    Define o número limite de latidos/miados por dia antes de sinalizar atividade excessiva.
                  </span>
                </div>
              </div>

              {/* Alert Sensitivity */}
              <div className="space-y-1">
                <Label htmlFor="alertSensitivity" className="text-xs font-semibold text-muted-foreground">
                  Sensibilidade do Modelo Acústico
                </Label>
                <select
                  id="alertSensitivity"
                  name="alertSensitivity"
                  defaultValue={baseline.alertSensitivity}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="low">Baixa (Apenas alertas críticos de angústia)</option>
                  <option value="medium">Média (Recomendado para cães/gatos no geral)</option>
                  <option value="high">Alta (Qualquer ruído desconhecido dispara alerta)</option>
                </select>
              </div>

              {/* Normal States checkboxes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground block">
                  Estados Típicos (Comportamento Normal)
                </Label>
                <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
                  Selecione os estados emocionais normais. Qualquer estado que NÃO esteja selecionado será assinalado como uma fuga à baseline no histórico.
                </p>

                <div className="grid grid-cols-2 gap-3 bg-secondary/40 p-3.5 rounded-xl border border-border/50">
                  {STATES.map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`normalState_${s}`}
                        name={`normalState_${s}`}
                        defaultChecked={baseline.normalStates.includes(s)}
                      />
                      <label
                        htmlFor={`normalState_${s}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer flex items-center gap-1"
                      >
                        <span>{STATE_EMOJIS[s]}</span>
                        <span>{STATE_LABELS[s]}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground gap-2 mt-2"
              disabled={updateBaselineMutation.isPending}
            >
              <Save size={16} />
              {updateBaselineMutation.isPending ? "A guardar calibração..." : "Guardar Calibração"}
            </Button>
          </form>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4 page-enter">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Registos de Tradução ({animal.name})
            </h2>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !historyRes || historyRes.events.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">Sem histórico</p>
                <p className="text-xs text-muted-foreground">Este animal ainda não tem registos de tradução.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyRes.events.map((ev) => {
                  const state = ev.state as EmotionalState;
                  const isNormal = baseline.normalStates.includes(ev.state);
                  const isThreat = ev.state === "distress" || ev.state === "alert";
                  const isAlert = !isNormal || isThreat;

                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "bg-card border border-border rounded-xl p-3 flex items-center justify-between transition-all hover:border-primary/30 relative",
                        isAlert && "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="text-2xl w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${STATE_COLORS[state]}15` }}
                        >
                          {STATE_EMOJIS[state]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground">
                              {STATE_LABELS[state] || ev.state}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                              {Math.round(Number(ev.confidence) * 100)}%
                            </Badge>
                            {isAlert && (
                              <Badge className="bg-rose-500 text-rose-foreground text-[8px] px-1 py-0 leading-none">
                                Alerta
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {new Date(ev.createdAt).toLocaleString("pt-PT")}
                          </span>
                        </div>
                      </div>

                      {/* Controls: Audio & Notes */}
                      <div className="flex items-center gap-1.5 z-10">
                        {ev.audioUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePlayToggle(ev.id, ev.audioUrl!)}
                            className="h-8 w-8 rounded-full hover:bg-secondary text-primary"
                          >
                            {playingAudioId === ev.id ? <Pause size={14} /> : <Play size={14} />}
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingNotesEventId(ev.id);
                            setTempNotes(ev.notes || "");
                          }}
                          className={cn(
                            "h-8 w-8 rounded-full hover:bg-secondary",
                            ev.notes ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          <MessageSquare size={14} />
                        </Button>

                        {/* Thumbs Feedback */}
                        <div className="flex border border-border rounded-lg bg-secondary/50 p-0.5">
                          <button
                            disabled={feedbackMutation.isPending}
                            onClick={() => feedbackMutation.mutate({ eventId: ev.id, feedback: "correct" })}
                            className={cn(
                              "p-1 rounded transition-all",
                              ev.feedback === "correct" ? "bg-emerald-500/20 text-emerald-500" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ThumbsUp size={10} />
                          </button>
                          <button
                            disabled={feedbackMutation.isPending}
                            onClick={() => feedbackMutation.mutate({ eventId: ev.id, feedback: "incorrect" })}
                            className={cn(
                              "p-1 rounded transition-all",
                              ev.feedback === "incorrect" ? "bg-rose-500/20 text-rose-500" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ThumbsDown size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {historyRes.total > 8 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      Página {historyPage} de {Math.ceil(historyRes.total / 8)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        className="h-7 text-xs"
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={historyPage >= Math.ceil(historyRes.total / 8)}
                        onClick={() => setHistoryPage((p) => p + 1)}
                        className="h-7 text-xs"
                      >
                        Seguinte
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Editor Modal */}
      <Dialog open={editingNotesEventId !== null} onOpenChange={(o) => !o && setEditingNotesEventId(null)}>
        <DialogContent className="bg-card border border-border rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground font-semibold flex items-center gap-1.5">
              <FileText size={16} className="text-primary" /> Notas de Observação
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Guarde anotações clínicas ou observações importantes sobre o estado do animal neste momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <textarea
              className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none min-h-[100px] resize-none"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Ex: Estava com fome e a miar junto ao comedouro..."
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setEditingNotesEventId(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary text-primary-foreground text-xs gap-1.5"
                disabled={updateNotesMutation.isPending}
                onClick={() =>
                  updateNotesMutation.mutate({
                    eventId: editingNotesEventId!,
                    notes: tempNotes,
                  })
                }
              >
                <Save size={13} />
                Guardar Notas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
