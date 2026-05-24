import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  FileText,
  Share2,
  TrendingUp,
  AlertTriangle,
  Heart,
  ChevronLeft,
  Activity,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { STATE_LABELS, STATE_COLORS, STATE_EMOJIS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

interface ActiveAnimal {
  id: number;
  name: string;
  species: "dog" | "cat";
  breed?: string;
  age?: number;
}

export default function VetPage() {
  const [vetName, setVetName] = useState("");
  const [vetEmail, setVetEmail] = useState("");
  const [vetNote, setVetNote] = useState("");

  const utils = trpc.useUtils();
  const { data: animals = [] } = trpc.animals.list.useQuery();
  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];

  const { data: events = [] } = trpc.animals.weeklyStats.useQuery(
    { animalId: activeAnimal?.id },
    { enabled: !!activeAnimal }
  );

  const { data: baseline } = trpc.animals.getBaseline.useQuery(
    { animalId: activeAnimal?.id || 1 },
    { enabled: !!activeAnimal }
  );

  const { data: beliefState } = trpc.animals.getBeliefState.useQuery(
    { animalId: activeAnimal?.id || 1 },
    { enabled: !!activeAnimal }
  );

  // Share report mutation
  const shareMutation = trpc.vet.shareReport.useMutation({
    onSuccess: () => {
      toast.success("Dossiê clínico partilhado com sucesso!");
      setVetName("");
      setVetEmail("");
      setVetNote("");
    },
    onError: (err) => {
      toast.error(`Erro ao partilhar o dossiê: ${err.message}`);
    },
  });

  // Calculate clinical metrics
  const stats = useMemo(() => {
    if (events.length === 0) {
      return {
        distressIndex: 0,
        agitationScore: 0,
        baselineConsistency: 100,
        totalEvents: 0,
        distressCount: 0,
        alertCount: 0,
        excitementCount: 0,
      };
    }

    const total = events.length;
    let distress = 0;
    let alert = 0;
    let excitement = 0;
    let consistent = 0;

    const normal = baseline?.normalStates || ["relaxed", "excitement"];

    events.forEach((e) => {
      if (e.state === "distress") distress++;
      if (e.state === "alert") alert++;
      if (e.state === "excitement") excitement++;
      if (normal.includes(e.state)) consistent++;
    });

    const distressIndex = Math.round(((distress + alert) / total) * 100);
    const agitationScore = Math.round(((excitement + alert) / total) * 100);
    const baselineConsistency = Math.round((consistent / total) * 100);

    return {
      distressIndex,
      agitationScore,
      baselineConsistency,
      totalEvents: total,
      distressCount: distress,
      alertCount: alert,
      excitementCount: excitement,
    };
  }, [events, baseline]);

  // Clinical recommendations
  const recommendations = useMemo(() => {
    const list: string[] = [];

    if (stats.distressIndex > 40) {
      list.push(
        "Frequência elevada de episódios de angústia e alerta. Recomenda-se realizar check-up para despiste de patologias dolorosas agudas (ex: otites, problemas osteoarticulares ou dor gastrointestinal)."
      );
    } else if (stats.distressIndex > 20) {
      list.push(
        "Níveis moderados de angústia detetados. Observe se estes estados coincidem com períodos de ausência do tutor ou alterações no ambiente doméstico (possível ansiedade de separação)."
      );
    }

    if (stats.agitationScore > 50) {
      list.push(
        "Índice de agitação elevado. Considere rever o nível de exercício físico diário e enriquecimento ambiental. Estados constantes de hiperatividade podem despoletar stress crónico."
      );
    }

    if (stats.baselineConsistency < 60) {
      list.push(
        "Desvio significativo da baseline de comportamento normal. O animal está a manifestar vocalizações fora do seu perfil habitual. Recomenda-se acompanhamento por especialista em comportamento animal ou veterinário."
      );
    }

    if (list.length === 0) {
      list.push(
        "O perfil de humor e comportamento acústico do animal está perfeitamente consistente com a baseline definida. Continue a monitorização de rotina."
      );
    }

    return list;
  }, [stats]);

  // Generate and download clinical PDF Dossier
  const handleDownloadPDF = () => {
    if (!activeAnimal) {
      toast.error("Nenhum animal selecionado.");
      return;
    }

    const doc = new jsPDF();
    const primaryColor = "#10b981"; // Emerald
    const dateStr = new Date().toLocaleDateString("pt-PT");

    // Header Title
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AnimalMind - Relatório Clínico", 15, 26);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${dateStr}`, 155, 26);

    // Patient Information Section
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("1. Informação do Paciente", 15, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Nome: ${activeAnimal.name}`, 15, 65);
    doc.text(`Espécie: ${activeAnimal.species === "dog" ? "Cão" : "Gato"}`, 15, 72);
    doc.text(`Raça: ${activeAnimal.breed || "Não informada"}`, 110, 65);
    doc.text(`Idade: ${activeAnimal.age !== undefined ? `${activeAnimal.age} anos` : "Não informada"}`, 110, 72);

    // Baseline details
    const normalStatesFormatted = baseline?.normalStates
      ? baseline.normalStates.map((s) => STATE_LABELS[s as EmotionalState] || s).join(", ")
      : "Relaxado, Excitação";
    doc.text(`Baseline Normal: ${normalStatesFormatted}`, 15, 82);
    doc.text(`Sensibilidade de Alerta: ${baseline?.alertSensitivity || "Média"}`, 110, 82);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 89, 195, 89);

    // Clinical Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("2. Métricas Clínicas (Últimos 7 dias)", 15, 99);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Total de Vocalizações Analisadas: ${stats.totalEvents}`, 15, 109);
    doc.text(`Índice de Angústia (Distress Index): ${stats.distressIndex}%`, 15, 117);
    doc.text(`Nível de Agitação (Agitation Score): ${stats.agitationScore}%`, 15, 125);
    doc.text(`Consistência de Baseline: ${stats.baselineConsistency}%`, 15, 133);

    // Belief POMDP consolidation
    if (beliefState) {
      doc.text("Distribuição do Humor Consolidado (POMDP Belief State):", 15, 143);
      doc.setFontSize(9);
      doc.text(`- Relaxado: ${Math.round(beliefState.relaxed * 100)}%`, 20, 150);
      doc.text(`- Excitação: ${Math.round(beliefState.excitement * 100)}%`, 20, 156);
      doc.text(`- Angústia: ${Math.round(beliefState.distress * 100)}%`, 80, 150);
      doc.text(`- Fome: ${Math.round(beliefState.hunger * 100)}%`, 80, 156);
      doc.text(`- Alerta: ${Math.round(beliefState.alert * 100)}%`, 140, 150);
      doc.text(`- Atenção: ${Math.round(beliefState.attention * 100)}%`, 140, 156);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 163, 195, 163);

    // Recommendations
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("3. Recomendações e Diagnóstico Preliminar", 15, 173);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let yOffset = 183;
    recommendations.forEach((rec) => {
      const splitText = doc.splitTextToSize(rec, 180);
      doc.text(splitText, 15, yOffset);
      yOffset += splitText.length * 6 + 2;
    });

    if (vetNote.trim().length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Notas Adicionais do Tutor:", 15, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const notesSplit = doc.splitTextToSize(vetNote, 180);
      doc.text(notesSplit, 15, yOffset + 6);
    }

    // Save report
    doc.save(`Relatorio_Clinico_${activeAnimal.name}_${dateStr.replace(/\//g, "-")}.pdf`);
    toast.success("PDF Clínico descarregado com sucesso!");
  };

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnimal) {
      toast.error("Nenhum animal selecionado.");
      return;
    }
    if (!vetName || !vetEmail) {
      toast.error("Por favor, preencha o nome e email do médico veterinário.");
      return;
    }
    shareMutation.mutate({
      animalId: activeAnimal.id,
      name: vetName,
      email: vetEmail,
      note: vetNote,
    });
  };

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-6 max-w-lg mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Modo Veterinário <Activity size={18} className="text-emerald-400" />
          </h1>
          <p className="text-xs text-muted-foreground">
            Dossiê clínico, estatísticas de comportamento e partilha profissional
          </p>
        </div>
      </div>

      {activeAnimal ? (
        <>
          {/* Active animal banner */}
          <div className="bg-gradient-to-tr from-emerald-950/20 to-secondary/30 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeAnimal.species === "dog" ? "🐕" : "🐈"}</span>
              <div>
                <p className="text-sm font-bold text-foreground">{activeAnimal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeAnimal.breed || "Sem Raça Definida"} ·{" "}
                  {activeAnimal.age !== undefined ? `${activeAnimal.age} anos` : "Idade indefinida"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
              Clínico Ativo
            </Badge>
          </div>

          {/* Clinical Indicators Grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Indicadores Clínicos (Últimos 7 dias)
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Distress index */}
              <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center space-y-1">
                <span className="p-1.5 bg-red-950/30 text-red-400 rounded-lg">
                  <AlertTriangle size={16} />
                </span>
                <span className="text-lg font-bold text-foreground">
                  {stats.distressIndex}%
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Índice de Angústia
                </span>
              </div>

              {/* Agitation Score */}
              <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center space-y-1">
                <span className="p-1.5 bg-orange-950/30 text-orange-400 rounded-lg">
                  <TrendingUp size={16} />
                </span>
                <span className="text-lg font-bold text-foreground">
                  {stats.agitationScore}%
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Nível de Agitação
                </span>
              </div>

              {/* Baseline Consistency */}
              <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center text-center space-y-1">
                <span className="p-1.5 bg-emerald-950/30 text-emerald-400 rounded-lg">
                  <CheckCircle size={16} />
                </span>
                <span className="text-lg font-bold text-foreground">
                  {stats.baselineConsistency}%
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Consistência Baseline
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Recommendations */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={16} />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Diagnóstico Preliminar AnimalMind
              </h3>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <p key={idx} className="text-xs text-muted-foreground leading-relaxed pl-2.5 border-l-2 border-primary/40">
                  {rec}
                </p>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-xl h-10 text-xs font-semibold gap-2"
            >
              <FileText size={16} />
              Exportar PDF Clínico
            </Button>
          </div>

          {/* Sharing Form */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-cyan-400" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Partilhar Dossiê Clínico com Veterinário
              </h3>
            </div>
            
            <form onSubmit={handleShare} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Nome do Médico Veterinário
                </label>
                <input
                  type="text"
                  required
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Email do Médico Veterinário
                </label>
                <input
                  type="email"
                  required
                  value={vetEmail}
                  onChange={(e) => setVetEmail(e.target.value)}
                  placeholder="Ex: joaosilva@clinica.local"
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Notas de Observação / Contexto
                </label>
                <textarea
                  value={vetNote}
                  onChange={(e) => setVetNote(e.target.value)}
                  placeholder="Ex: Tem estado um pouco agitado nas últimas manhãs..."
                  className="w-full min-h-[70px] bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={shareMutation.isPending}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 font-semibold text-white shadow-md rounded-xl text-xs h-10 mt-1"
              >
                {shareMutation.isPending ? "A enviar..." : "Partilhar Relatório Ficheiro"}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 text-center text-muted-foreground text-sm">
          A carregar dados do animal...
        </div>
      )}
    </div>
  );
}
