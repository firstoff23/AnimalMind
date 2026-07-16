import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, Filter, Loader2 } from "lucide-react";
import { Link } from "wouter";

// Emotion state translations (for displaying them nicely)
const STATE_TRANSLATIONS: Record<string, string> = {
  relaxed: "Relaxado",
  distress: "Angústia",
  attention: "Atenção",
  excitement: "Excitação",
  hunger: "Fome",
  alert: "Alerta",
};

export default function FeedbackAuditPage() {
  const { language } = useLanguage();
  
  // State for inputs
  const [animalTypeInput, setAnimalTypeInput] = useState<string>("all");
  const [fromInput, setFromInput] = useState<string>("");
  const [toInput, setToInput] = useState<string>("");

  // State for active query filters (only updated when clicking "Filtrar")
  const [activeFilters, setActiveFilters] = useState({
    animal_type: "all",
    from: "",
    to: "",
  });

  // tRPC query to fetch the list of feedback annotations
  const { data: feedbackList = [], isLoading, error, refetch } = trpc.feedback.list.useQuery({
    animal_type: activeFilters.animal_type !== "all" ? activeFilters.animal_type : undefined,
    from: activeFilters.from || undefined,
    to: activeFilters.to || undefined,
  });

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters({
      animal_type: animalTypeInput,
      from: fromInput,
      to: toInput,
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header with Back button */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/definicoes">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Auditoria de Feedback</h1>
            <p className="text-xs text-muted-foreground">
              Monitoriza e audita os desvios e correções dos modelos de IA do AnimalMind
            </p>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleFilter} className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/30 pb-2">
          <Filter className="h-4 w-4 text-primary" />
          <span>Filtros de Pesquisa</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Animal Type dropdown */}
          <div className="space-y-1">
            <label htmlFor="animal-type-select" className="text-xs font-semibold text-muted-foreground block">
              Tipo de Animal
            </label>
            <select
              id="animal-type-select"
              value={animalTypeInput}
              onChange={(e) => setAnimalTypeInput(e.target.value)}
              className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="all">Todos</option>
              <option value="dog">Cão</option>
              <option value="cat">Gato</option>
            </select>
          </div>

          {/* Date pickers */}
          <div className="space-y-1">
            <label htmlFor="date-from" className="text-xs font-semibold text-muted-foreground block">
              De
            </label>
            <input
              id="date-from"
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="date-to" className="text-xs font-semibold text-muted-foreground block">
              Até
            </label>
            <input
              id="date-to"
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" className="px-5 font-semibold">
            Filtrar
          </Button>
        </div>
      </form>

      {/* Main Results Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">A carregar auditorias de feedback...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-destructive">Erro ao carregar auditorias.</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Nenhuma anotação encontrada.</p>
            <p className="text-xs text-muted-foreground/60">Tente ajustar as datas ou filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Animal</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Raça Prevista</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Raça Confirmada</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Estado Previsto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Estado Confirmado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Confiança</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/40 hover:bg-muted/5 last:border-0 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">#{item.id}</td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {item.animal_type === "dog" ? "🐶 Cão" : "🐱 Gato"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground italic">
                      {item.predicted_breed || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {item.confirmed_breed || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.predicted_state ? (STATE_TRANSLATIONS[item.predicted_state] || item.predicted_state) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {item.confirmed_state ? (STATE_TRANSLATIONS[item.confirmed_state] || item.confirmed_state) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-mono font-semibold">
                      {item.confidence !== null && item.confidence !== undefined
                        ? `${Math.round(item.confidence * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.created_at ? formatDate(item.created_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with counts */}
        {!isLoading && !error && (
          <div className="bg-muted/20 border-t border-border px-4 py-3 text-center sm:text-left">
            <span className="text-xs text-muted-foreground">
              Total: <strong>{feedbackList.length}</strong> {feedbackList.length === 1 ? "anotação" : "anotações"} de feedback
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
