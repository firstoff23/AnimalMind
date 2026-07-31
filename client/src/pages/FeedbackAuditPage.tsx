import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft, Filter, Check, CheckCircle, ClipboardList, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { toast } from "sonner";
import { type EmotionalState } from "../../../shared/types";

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
  const { t, language } = useLanguage();
  
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // State for inputs
  const [animalTypeInput, setAnimalTypeInput] = useState<string>("all");
  const [fromInput, setFromInput] = useState<string>("");
  const [toInput, setToInput] = useState<string>("");
  const [reviewedInput, setReviewedInput] = useState<"all" | "pending" | "reviewed">("all");
  const [predictedStateInput, setPredictedStateInput] = useState<EmotionalState | "all">("all");

  // State for active query filters (only updated when clicking "Filtrar")
  const [activeFilters, setActiveFilters] = useState<{
    animal_type: string;
    from: string;
    to: string;
    reviewed: "all" | "pending" | "reviewed";
    predicted_state: EmotionalState | "all";
  }>({
    animal_type: "all",
    from: "",
    to: "",
    reviewed: "all",
    predicted_state: "all",
  });

  // tRPC query to fetch the list of feedback annotations
  const { data, isLoading, error, refetch } = trpc.feedback.list.useQuery({
    animal_type: activeFilters.animal_type !== "all" ? activeFilters.animal_type : undefined,
    from: activeFilters.from || undefined,
    to: activeFilters.to || undefined,
    reviewed: activeFilters.reviewed,
    predicted_state: activeFilters.predicted_state !== "all" ? activeFilters.predicted_state : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const feedbackList = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const logAnalyticsMutation = trpc.analytics.logEvent.useMutation();

  const reviewMutation = trpc.feedback.review.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Feedback verificado e revisto com sucesso!");
      refetch();
      logAnalyticsMutation.mutate({
        eventName: "audit_reviewed",
        properties: {
          feedbackId: variables.feedbackId,
        },
      });
    },
    onError: (err) => {
      toast.error("Erro ao rever feedback: " + err.message);
    },
  });

  useEffect(() => {
    logAnalyticsMutation.mutate({ eventName: "audit_page_opened" });
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveFilters({
      animal_type: animalTypeInput,
      from: fromInput,
      to: toInput,
      reviewed: reviewedInput,
      predicted_state: predictedStateInput,
    });
  };

  const resetFilters = () => {
    setAnimalTypeInput("all");
    setFromInput("");
    setToInput("");
    setReviewedInput("all");
    setPredictedStateInput("all");
    setActiveFilters({
      animal_type: "all",
      from: "",
      to: "",
      reviewed: "all",
      predicted_state: "all",
    });
    setPage(1);
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
              Monitoriza e audita os desvios e correções dos modelos de IA do PeloNaRoupa
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

          <div className="space-y-1">
            <label htmlFor="predicted-state-select" className="text-xs font-semibold text-muted-foreground block">
              Estado previsto
            </label>
            <select
              id="predicted-state-select"
              value={predictedStateInput}
              onChange={(e) => setPredictedStateInput(e.target.value as EmotionalState | "all")}
              className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="all">Todos</option>
              {Object.entries(STATE_TRANSLATIONS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="reviewed-select" className="text-xs font-semibold text-muted-foreground block">
              Estado de revisão
            </label>
            <select
              id="reviewed-select"
              value={reviewedInput}
              onChange={(e) => setReviewedInput(e.target.value as "all" | "pending" | "reviewed")}
              className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="reviewed">Revisto</option>
            </select>
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
          <div className="p-4 space-y-3">
            {[1,2,3,4].map(n => (
              <div key={n} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            ))}
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
          <div className="py-20 text-center space-y-3 flex flex-col items-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">
              {t("auditPage.emptyTitle") || "Nenhuma anotação encontrada."}
            </p>
            {(activeFilters.animal_type !== "all" || activeFilters.from || activeFilters.to || activeFilters.reviewed !== "all" || activeFilters.predicted_state !== "all") && (
              <div className="space-y-3 flex flex-col items-center">
                <p className="text-xs text-muted-foreground/60">
                  Tenta limpar os filtros para ver todos os registos.
                </p>
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Cards — mobile (<md) */}
            <div className="md:hidden divide-y divide-border/40">
              {feedbackList.map((item: any) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">#{item.id}</span>
                    {item.reviewed_by ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle size={10} />
                        Revisto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">
                        Pendente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {item.animal_type === "dog" ? "🐶 Cão" : "🐱 Gato"}
                    </span>
                    <span className="font-mono font-semibold">
                      {item.confidence !== null && item.confidence !== undefined
                        ? `${Math.round(item.confidence * 100)}%`
                        : "—"}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Previsto:{" "}
                      {item.predicted_state
                        ? STATE_TRANSLATIONS[item.predicted_state] || item.predicted_state
                        : "—"}
                      {item.predicted_breed ? ` · ${item.predicted_breed}` : ""}
                    </p>
                    <p className="text-foreground font-semibold">
                      Confirmado:{" "}
                      <span
                        className={
                          item.predicted_state &&
                          item.confirmed_state &&
                          item.predicted_state !== item.confirmed_state
                            ? "text-rose-400"
                            : ""
                        }
                      >
                        {item.confirmed_state
                          ? STATE_TRANSLATIONS[item.confirmed_state] || item.confirmed_state
                          : "—"}
                      </span>
                    </p>
                    {item.comment && <p className="italic">"{item.comment}"</p>}
                    <p>{item.created_at ? formatDate(item.created_at) : "—"}</p>
                    {item.audioUrl && (
                      <audio controls src={item.audioUrl} className="w-full h-8 mt-2" />
                    )}
                  </div>

                  {!item.reviewed_by ? (
                    <button
                      className="w-full h-11 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg border border-primary/20 transition-colors disabled:opacity-70"
                      onClick={() => {
                        logAnalyticsMutation.mutate({
                          eventName: "audit_review_clicked",
                          properties: { feedbackId: item.id },
                        });
                        reviewMutation.mutate({ feedbackId: item.id });
                      }}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending && reviewMutation.variables?.feedbackId === item.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>A rever...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Rever</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-muted-foreground/60 text-[10px] font-medium text-right">
                      Por ID #{item.reviewed_by}
                      {item.reviewed_at ? ` · ${formatDate(item.reviewed_at)}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Tabela — desktop (md+), inalterada */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Animal</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Raça Prevista</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Estado Previsto</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Estado Confirmado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Confiança</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Observações</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Áudio</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Ações</th>
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.predicted_state ? (STATE_TRANSLATIONS[item.predicted_state] || item.predicted_state) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <span
                          className={
                            item.predicted_state &&
                            item.confirmed_state &&
                            item.predicted_state !== item.confirmed_state
                              ? "text-rose-400"
                              : ""
                          }
                        >
                          {item.confirmed_state ? (STATE_TRANSLATIONS[item.confirmed_state] || item.confirmed_state) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono font-semibold">
                        {item.confidence !== null && item.confidence !== undefined
                          ? `${Math.round(item.confidence * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.comment ? (
                          <span className="text-muted-foreground truncate max-w-[150px] block" title={item.comment}>
                            {item.comment}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.audioUrl ? (
                          <audio controls src={item.audioUrl} className="h-8 w-44" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.created_at ? formatDate(item.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.reviewed_by ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                            <CheckCircle size={10} />
                            Revisto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {!item.reviewed_by ? (
                          <button
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 hover:bg-primary text-primary hover:text-white px-2 py-1 rounded-lg border border-primary/20 transition-colors disabled:opacity-50"
                            onClick={() => {
                              logAnalyticsMutation.mutate({
                                eventName: "audit_review_clicked",
                                properties: { feedbackId: item.id },
                              });
                              reviewMutation.mutate({ feedbackId: item.id });
                            }}
                            disabled={reviewMutation.isPending}
                          >
                            {reviewMutation.isPending && reviewMutation.variables?.feedbackId === item.id ? (
                              <>
                                <Loader2 size={10} className="animate-spin" />
                                <span>A rever...</span>
                              </>
                            ) : (
                              <>
                                <Check size={10} />
                                <span>Rever</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/60 text-[10px] font-medium">
                            Por ID #{item.reviewed_by}
                            {item.reviewed_at ? ` · ${formatDate(item.reviewed_at)}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer with counts */}
        {!isLoading && !error && (
          <div className="bg-muted/20 border-t border-border px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Total: <strong>{total}</strong> anotações · Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
