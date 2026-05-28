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
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import FamilyShareTab from "@/components/FamilyShareTab";
import HealthBulletinTab from "@/components/HealthBulletinTab";
import { useLanguage } from "@/hooks/useLanguage";
import {
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
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
  const [activeTab, setActiveTab] = useState<"stats" | "bulletin" | "baseline" | "share">("stats");
  const { t, language } = useLanguage();
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
      toast.error(language === "pt" ? "Animal não encontrado ou não autorizado." : "Animal not found or not authorized.");
      setLocation("/perfil");
    }
  }, [animalError, setLocation, language]);

  const { data: baseline, isLoading: loadingBaseline } = trpc.animals.getBaseline.useQuery(
    { animalId }
  );

  const { data: stats30, isLoading: loadingStats30 } = trpc.events.statsForAnimal.useQuery(
    { animalId, days: 30 }
  );

  const { data: stats7, isLoading: loadingStats7 } = trpc.events.statsForAnimal.useQuery(
    { animalId, days: 7 }
  );

  const { data: historyRes, isLoading: loadingHistory } = trpc.events.listForAnimal.useQuery(
    { animalId, page: 1, pageSize: 10 }
  );

  // Mutations
  const updateBaselineMutation = trpc.animals.updateBaseline.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Baseline comportamental atualizada com sucesso!" : "Behavioral baseline updated successfully!");
      utils.animals.getBaseline.invalidate({ animalId });
      utils.events.statsForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error(language === "pt" ? "Erro ao atualizar baseline." : "Error updating baseline."),
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => {
      utils.events.listForAnimal.invalidate({ animalId });
      utils.events.statsForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error(language === "pt" ? "Erro ao guardar feedback." : "Error saving feedback."),
  });

  const updateNotesMutation = trpc.events.updateNotes.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Notas guardadas!" : "Notes saved!");
      setEditingNotesEventId(null);
      utils.events.listForAnimal.invalidate({ animalId });
    },
    onError: () => toast.error(language === "pt" ? "Erro ao guardar notas." : "Error saving notes."),
  });

  // Calculations for dashboard
  const dominantStateWeekly = useMemo<EmotionalState | null>(() => {
    if (!stats7 || !stats7.stateDistribution || stats7.totalCount === 0) return null;
    let maxCount = 0;
    let maxState: EmotionalState | null = null;
    Object.entries(stats7.stateDistribution).forEach(([st, cnt]) => {
      if ((cnt as number) > maxCount) {
        maxCount = cnt as number;
        maxState = st as EmotionalState;
      }
    });
    return maxState;
  }, [stats7]);

  const trendChartData = useMemo(() => {
    if (!stats30 || !stats30.dailyActivity) return [];
    return stats30.dailyActivity.map((day) => {
      const formatted: any = { date: day.date };
      const dayAny = day as any;
      STATES.forEach((s) => {
        formatted[s] = dayAny[s] || 0;
      });
      return formatted;
    });
  }, [stats30]);

  const barChartData = useMemo(() => {
    if (!stats30 || !stats30.stateDistribution) return [];
    return STATES.map((s) => ({
      state: t("states." + s),
      value: stats30.stateDistribution[s] || 0,
      color: STATE_COLORS[s],
      emoji: STATE_EMOJIS[s],
    })).filter((item) => item.value > 0);
  }, [stats30, t]);

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
    const stats = stats30;
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
      doc.text(language === "pt" ? "AnimalMind 🐾 - Relatório Clínico" : "AnimalMind 🐾 - Clinical Report", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text(`${language === "pt" ? "Gerado em:" : "Generated on:" } ${new Date().toLocaleString(language === "pt" ? "pt-PT" : "en-US")}`, 15, 28);
      doc.text(`${language === "pt" ? "Código do Animal:" : "Animal Code:"} #${animal.id}`, 15, 34);

      // Horizontal separator
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 45, 195, 45);

      // Animal Info Card
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(language === "pt" ? "Identificação do Animal" : "Animal Identification", 15, 55);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`${language === "pt" ? "Nome:" : "Name:"} ${animal.name}`, 15, 63);
      doc.text(`${language === "pt" ? "Espécie:" : "Species:"} ${animal.species === "dog" ? (language === "pt" ? "Cão 🐕" : "Dog 🐕") : (language === "pt" ? "Gato 🐈" : "Cat 🐈")}`, 15, 70);
      doc.text(`${language === "pt" ? "Raça:" : "Breed:"} ${animal.breed ?? (language === "pt" ? "Desconhecida" : "Unknown")}`, 110, 63);
      doc.text(`${language === "pt" ? "Idade:" : "Age:"} ${animal.age !== null ? `${animal.age} ${language === "pt" ? "anos" : "years"}` : "—"}`, 110, 70);

      // Baseline parameters
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(language === "pt" ? "Baseline Comportamental (Calibração)" : "Behavioral Baseline (Calibration)", 15, 85);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`${language === "pt" ? "Sensibilidade de Alertas:" : "Alerts Sensitivity:"} ${t("settingsPage.alertsSensitivity" + baseline.alertSensitivity.charAt(0).toUpperCase() + baseline.alertSensitivity.slice(1))}`, 15, 93);
      doc.text(`${language === "pt" ? "Limiar de Vocalizações:" : "Vocalization Threshold:"} ${baseline.vocalizationThreshold} ${language === "pt" ? "por dia" : "per day"}`, 15, 100);
      
      const normalStatesText = baseline.normalStates
        .map((s) => t("states." + (s as EmotionalState)) || s)
        .join(", ");
      doc.text(`${language === "pt" ? "Estados Típicos/Normais:" : "Typical/Normal States:"} ${normalStatesText || (language === "pt" ? "Nenhum" : "None")}`, 15, 107);

      // Stats Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(language === "pt" ? "Estatísticas Acústicas (Últimos 30 dias)" : "Acoustic Statistics (Last 30 Days)", 15, 122);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`${language === "pt" ? "Total de vocalizações registadas:" : "Total registered vocalizations:"} ${stats.totalCount}`, 15, 130);

      // Find dominant state
      let maxCount = 0;
      let dominant = "Relaxado";
      Object.entries(stats.stateDistribution).forEach(([st, cnt]) => {
        if ((cnt as number) > maxCount) {
          maxCount = cnt as number;
          dominant = t("states." + (st as EmotionalState)) || st;
        }
      });
      doc.text(`${language === "pt" ? "Estado dominante no período:" : "Dominant state in the period:"} ${dominant} (${maxCount} ${language === "pt" ? "ocorrências" : "occurrences"})`, 15, 137);

      // Table Header for Recent events
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 150, 180, 8, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(language === "pt" ? "Data e Hora" : "Date and Time", 18, 155);
      doc.text(language === "pt" ? "Estado Traduzido" : "Translated State", 65, 155);
      doc.text(language === "pt" ? "Confiança" : "Confidence", 110, 155);
      doc.text(language === "pt" ? "Modelo" : "Model", 135, 155);
      doc.text(language === "pt" ? "Notas" : "Notes", 165, 155);

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

        const dateStr = new Date(ev.createdAt).toLocaleString(language === "pt" ? "pt-PT" : "en-US", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        doc.text(dateStr, 18, y);
        doc.text(t("states." + (ev.state as EmotionalState)) || ev.state, 65, y);
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
      doc.text(language === "pt" ? "AnimalMind 🐾 — Monitorização de Bem-Estar Animal em Tempo Real" : "AnimalMind 🐾 — Real-Time Animal Well-Being Monitoring", 15, 275);
      doc.text(language === "pt" ? "Relatório confidencial gerado pelo tutor." : "Confidential report generated by the guardian.", 15, 280);

      doc.save(`${language === "pt" ? "relatorio" : "report"}_${animal.name}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(language === "pt" ? "Relatório PDF descarregado!" : "PDF Report downloaded!");
    } catch (err) {
      console.error(err);
      toast.error(language === "pt" ? "Erro ao gerar relatório PDF." : "Error generating PDF report.");
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

  if (loadingAnimal || loadingBaseline || loadingStats30 || loadingStats7 || loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground text-sm">{t("calibration.loadingDetails")}</p>
      </div>
    );
  }

  if (!animal || !baseline) return null;

  // Anomaly check based on baseline settings
  // Anomaly is defined as a distress/alert state vocalization, OR a state that is NOT in the animal's typical states list
  const recentEvents = historyRes?.events || [];
  const anomalyAlerts = recentEvents.filter((ev) => {
    const baselineFrequency = baseline.stateDistribution?.[ev.state] ?? 0;
    const isRareForAnimal = (baseline.sampleSize ?? 0) >= 5 && baselineFrequency < 0.1;
    const isNormal = baseline.normalStates.includes(ev.state) && !isRareForAnimal;
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
          <ArrowLeft size={16} /> {t("common.back")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Download size={15} /> {t("calibration.downloadPdf")}
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
              {animal.species === "dog" ? t("profilePage.speciesDog") : t("profilePage.speciesCat")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {animal.breed || t("calibration.noBreedDefined")} • {animal.age !== null ? `${animal.age} ${language === "pt" ? "anos" : "years"}` : t("calibration.unknownAge")}
          </p>
        </div>
      </div>

      {/* Anomaly banner if alerts exist */}
      {anomalyAlerts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start page-enter">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wide">
              {t("calibration.recentAlerts")}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {t("calibration.eventsDetected").replace("{count}", String(anomalyAlerts.length))}
            </p>
          </div>
        </div>
      )}

      {/* Glassmorphic Tab switcher */}
      <div className="flex bg-secondary/60 p-1 rounded-xl border border-border/80">
        {(["stats", "bulletin", "baseline", "share"] as const)
          .filter((tab) => tab !== "share" || !animal.isShared)
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1",
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "stats" && <Activity size={13} />}
              {tab === "bulletin" && <FileText size={13} />}
              {tab === "baseline" && <Settings size={13} />}
              {tab === "share" && <Users size={13} />}
              {tab === "stats" && t("nav.dashboard")}
              {tab === "bulletin" && t("bulletin.tabTitle")}
              {tab === "baseline" && (language === "pt" ? "Calibrar" : "Calibrate")}
              {tab === "share" && (language === "pt" ? "Co-tutores" : "Co-tutors")}
            </button>
          ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* STATS TAB (DASHBOARD) */}
        {activeTab === "stats" && (
          <div className="space-y-6 page-enter">
            {/* Estado emocional dominante da semana atual */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("calibration.dominantStateTitle")}
              </h3>
              {dominantStateWeekly ? (
                <div className="flex items-center gap-4 pt-1">
                  <div className="text-5xl bg-secondary/80 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                    {STATE_EMOJIS[dominantStateWeekly]}
                  </div>
                  <div>
                    <p className="text-2xl font-bold capitalize" style={{ color: STATE_COLORS[dominantStateWeekly] }}>
                      {t("states." + dominantStateWeekly)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("calibration.dominantStateDesc").replace("{state}", (t("states." + dominantStateWeekly)).toLowerCase())}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-1 text-muted-foreground text-sm italic">
                  <span>ℹ️ {t("calibration.noRecordsWeek")}</span>
                </div>
              )}
            </div>

            {/* 1. Gráfico de tendências dos últimos 30 dias */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("calibration.trendsTitle")}
              </h3>
              {trendChartData.length === 0 || stats30?.totalCount === 0 ? (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-xs italic">
                  {t("calibration.noTrendsData")}
                </div>
              ) : (
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ left: -25, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }}
                        tickFormatter={(str) => {
                          const parts = str.split("-");
                          return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : str;
                        }}
                      />
                      <YAxis allowDecimals={false} tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }} />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.12 0.012 264)",
                          border: "1px solid oklch(0.22 0.012 264)",
                          borderRadius: "12px",
                          color: "oklch(0.97 0.003 264)",
                          fontSize: 11,
                        }}
                      />
                      {STATES.map((s) => (
                        <Line
                          key={s}
                          type="monotone"
                          dataKey={s}
                          name={t("states." + s)}
                          stroke={STATE_COLORS[s]}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 2. Distribuição de estados em gráfico de barras */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("calibration.distributionTitle")}
              </h3>
              {barChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-xs italic">
                  {t("calibration.noDistributionData")}
                </div>
              ) : (
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.012 264)" vertical={false} />
                      <XAxis
                        dataKey="state"
                        tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 9 }}
                      />
                      <YAxis allowDecimals={false} tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 9 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={{
                          background: "oklch(0.12 0.012 264)",
                          border: "1px solid oklch(0.22 0.012 264)",
                          borderRadius: "12px",
                          color: "oklch(0.97 0.003 264)",
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="value" name={language === "pt" ? "Ocorrências" : "Occurrences"} radius={[6, 6, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 3. Lista dos últimos 10 eventos de classificação */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("calibration.recentRegistries")}
              </h3>
              {!historyRes || historyRes.events.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs italic">
                  {t("calibration.noRegistriesForAnimal")}
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRes.events.map((ev) => {
                    const state = ev.state as EmotionalState;
                    const baselineFrequency = baseline.stateDistribution?.[ev.state] ?? 0;
                    const isRareForAnimal = (baseline.sampleSize ?? 0) >= 5 && baselineFrequency < 0.1;
                    const isNormal = baseline.normalStates.includes(ev.state) && !isRareForAnimal;
                    const isThreat = ev.state === "distress" || ev.state === "alert";
                    const isAlert = !isNormal || isThreat;

                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          "bg-secondary/20 border border-border/80 rounded-xl p-3 flex items-center justify-between transition-all hover:border-primary/30 relative",
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
                                {t("states." + state) || ev.state}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                                {Math.round(Number(ev.confidence) * 100)}%
                              </Badge>
                              {isAlert && (
                                <Badge className="bg-rose-500 text-rose-foreground text-[8px] px-1 py-0 leading-none">
                                  {t("calibration.alertBadge")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {new Date(ev.createdAt).toLocaleString(language === "pt" ? "pt-PT" : "en-US")}
                            </span>
                            {ev.notes && (
                              <p className="text-[10px] text-cyan-400 italic mt-1 max-w-[200px] truncate">
                                📝 "{ev.notes}"
                              </p>
                            )}
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
                </div>
              )}

              {/* Botão Ver histórico completo */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/historico?animalId=${animal.id}`)}
                  className="w-full text-xs font-semibold border-primary/20 hover:bg-primary/10 text-primary h-10 rounded-xl"
                >
                  {t("calibration.viewFullHistory")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* BULLETIN TAB (HEALTH BULLETIN) */}
        {activeTab === "bulletin" && (
          <div className="page-enter">
            <HealthBulletinTab
              animalId={animalId}
              species={animal.species}
              animal={animal}
              onRefreshAnimal={() => utils.animals.get.invalidate({ animalId })}
            />
          </div>
        )}

        {/* BASELINE TAB (CALIBRATION) */}
        {activeTab === "baseline" && (
          <form onSubmit={handleBaselineSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-5 page-enter">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={16} className="text-primary animate-pulse" /> {t("calibration.title")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("calibration.desc")}
                  </p>
                </div>
                {animal.isShared && (
                  <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-950/20 uppercase font-semibold">
                    {language === "pt" ? `Co-tutor (${animal.permission})` : `Co-guardian (${animal.permission})`}
                  </Badge>
                )}
              </div>
            </div>

            {animal.permission === "read" && (
              <div className="bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs rounded-xl p-3 flex gap-2 items-center">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{t("calibration.readOnlyMode")}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Vocalization Threshold */}
              <div className="space-y-1">
                <Label htmlFor="vocalizationThreshold" className="text-xs font-semibold text-muted-foreground">
                  {t("calibration.vocalizationThreshold")}
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="number"
                    id="vocalizationThreshold"
                    name="vocalizationThreshold"
                    defaultValue={baseline.vocalizationThreshold}
                    disabled={animal.permission === "read"}
                    min={1}
                    max={100}
                    className="bg-secondary border-border w-24 text-center font-bold"
                  />
                  <span className="text-xs text-muted-foreground">
                    {t("calibration.vocalizationThresholdDesc")}
                  </span>
                </div>
              </div>

              {/* Alert Sensitivity */}
              <div className="space-y-1">
                <Label htmlFor="alertSensitivity" className="text-xs font-semibold text-muted-foreground">
                  {t("calibration.sensitivityTitle")}
                </Label>
                <select
                  id="alertSensitivity"
                  name="alertSensitivity"
                  defaultValue={baseline.alertSensitivity}
                  disabled={animal.permission === "read"}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="low">{language === "pt" ? "Baixa (Apenas alertas críticos de angústia)" : "Low (Only critical distress alerts)"}</option>
                  <option value="medium">{language === "pt" ? "Média (Recomendado para cães/gatos no geral)" : "Medium (Recommended for general dogs/cats)"}</option>
                  <option value="high">{language === "pt" ? "Alta (Qualquer ruído desconhecido dispara alerta)" : "High (Any unknown noise triggers alert)"}</option>
                </select>
              </div>

              {/* Normal States checkboxes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground block">
                  {t("calibration.typicalStates")}
                </Label>
                <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
                  {t("calibration.typicalStatesDesc")}
                </p>

                <div className="grid grid-cols-2 gap-3 bg-secondary/40 p-3.5 rounded-xl border border-border/50">
                  {STATES.map((s) => (
                    <div key={s} className="flex items-center space-x-2">
                      <Checkbox
                        id={`normalState_${s}`}
                        name={`normalState_${s}`}
                        disabled={animal.permission === "read"}
                        defaultChecked={baseline.normalStates.includes(s)}
                      />
                      <label
                        htmlFor={`normalState_${s}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer flex items-center gap-1"
                      >
                        <span>{STATE_EMOJIS[s]}</span>
                        <span>{t("states." + s)}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {animal.permission !== "read" && (
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground gap-2 mt-2"
                disabled={updateBaselineMutation.isPending}
              >
                <Save size={16} />
                {updateBaselineMutation.isPending ? t("calibration.saving") : t("calibration.save")}
              </Button>
            )}
          </form>
        )}


        {/* SHARE TAB */}
        {activeTab === "share" && !animal.isShared && (
          <div className="page-enter">
            <FamilyShareTab animalId={animalId} />
          </div>
        )}
      </div>

      {/* Notes Editor Modal */}
      <Dialog open={editingNotesEventId !== null} onOpenChange={(o) => !o && setEditingNotesEventId(null)}>
        <DialogContent className="bg-card border border-border rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-foreground font-semibold flex items-center gap-1.5">
              <FileText size={16} className="text-primary" /> {t("calibration.observationNotes")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("calibration.observationNotesDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <textarea
              className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none min-h-[100px] resize-none"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder={t("calibration.placeholderNotes")}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setEditingNotesEventId(null)}
              >
                {t("common.cancel")}
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
                {t("calibration.saveNotes")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
