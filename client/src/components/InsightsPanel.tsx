// client/src/components/InsightsPanel.tsx
//
// Painel de insights agregados (Fase 3), para usar dentro de HistoryPage
// quando um animal específico está selecionado (hasAnimalFilter === true).
// Reutiliza Badge, Skeleton, STATE_COLORS/EMOJIS/LABELS e o estilo de
// card já usado no painel de filtros do HistoryPage.

import { Handshake, Info, MessageSquareText, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS, STATE_EMOJIS, STATE_LABELS } from "../../../shared/types";

const PERIOD_LABELS_PT: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};
const PERIOD_LABELS_EN: Record<string, string> = {
  manha: "Morning",
  tarde: "Afternoon",
  noite: "Evening",
};

function stateLabel(state: string, t: (key: any) => string) {
  return t(`states.${state}` as any) || STATE_LABELS[state as EmotionalState] || state;
}

export function InsightsPanel({ animalId }: { animalId: number }) {
  const { t, language } = useLanguage();
  const { data, isLoading } = trpc.insights.forAnimal.useQuery({ animalId });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 page-enter">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const { feedbackRate, periodOfDay, topContextByState, trend, modelAgreement } = data;

  const hasPeriodData = Object.values(periodOfDay).some((p) => p.dominantState !== null);
  const isEmpty =
    !feedbackRate &&
    !hasPeriodData &&
    topContextByState.length === 0 &&
    trend.length === 0 &&
    !modelAgreement;

  const periodLabels = language === "pt" ? PERIOD_LABELS_PT : PERIOD_LABELS_EN;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <TrendingUp size={14} className="text-primary" />
          {language === "pt" ? "Insights" : "Insights"}
        </h2>
      </div>

      {isEmpty ? (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          {language === "pt"
            ? "Ainda não há dados suficientes para mostrar padrões. Continua a gravar e a confirmar leituras."
            : "Not enough data yet to show patterns. Keep recording and confirming readings."}
        </p>
      ) : (
        <div className="space-y-4">
          {/* 1. Taxa de feedback */}
          {feedbackRate && (
            <div className="flex items-center gap-3">
              <MessageSquareText size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-foreground">
                  {language === "pt"
                    ? `Confirmaste ${Math.round(feedbackRate.rate * 100)}% das leituras`
                    : `You confirmed ${Math.round(feedbackRate.rate * 100)}% of readings`}
                </p>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(feedbackRate.rate * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Padrão por período do dia */}
          {hasPeriodData && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                {language === "pt" ? "Padrão por período" : "Pattern by time of day"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["manha", "tarde", "noite"] as const).map((period) => {
                  const bucket = periodOfDay[period];
                  const state = bucket.dominantState as EmotionalState | null;
                  return (
                    <div
                      key={period}
                      className="rounded-xl bg-secondary/40 p-2.5 text-center space-y-1"
                    >
                      <p className="text-[10px] text-muted-foreground">
                        {periodLabels[period]}
                      </p>
                      {state ? (
                        <>
                          <span className="text-lg block">{STATE_EMOJIS[state]}</span>
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: STATE_COLORS[state] }}
                          >
                            {stateLabel(state, t)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Contexto mais associado a cada estado */}
          {topContextByState.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                {language === "pt" ? "Contexto mais comum por estado" : "Most common context by state"}
              </p>
              <div className="space-y-1.5">
                {topContextByState.map((item) => (
                  <div key={item.state} className="flex items-center gap-2 text-xs">
                    <span style={{ color: STATE_COLORS[item.state as EmotionalState] }}>
                      {STATE_EMOJIS[item.state as EmotionalState]}
                    </span>
                    <span className="text-foreground">
                      {stateLabel(item.state, t)}
                      {language === "pt" ? " → mais comum: " : " → most common: "}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border-white/5 bg-white/5 text-slate-300 capitalize"
                    >
                      {item.tag.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-muted-foreground text-[10px]">
                      ({item.occurrences}/{item.totalForState})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Tendência temporal */}
          {trend.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                {language === "pt" ? "Tendência (últimas 4 semanas)" : "Trend (last 4 weeks)"}
              </p>
              <div className="space-y-1.5">
                {trend.slice(0, 3).map((item) => {
                  const isUp = item.changePercent! > 0;
                  return (
                    <div
                      key={item.state}
                      className="flex items-center gap-2 text-xs"
                      title={
                        language === "pt"
                          ? `Comparado com as 4 semanas anteriores (${item.previousCount} → ${item.recentCount} registos)`
                          : `Compared to the previous 4 weeks (${item.previousCount} → ${item.recentCount} events)`
                      }
                    >
                      {isUp ? (
                        <TrendingUp size={12} className="text-amber-400 flex-shrink-0" />
                      ) : (
                        <TrendingDown size={12} className="text-emerald-400 flex-shrink-0" />
                      )}
                      <span
                        className="font-semibold"
                        style={{ color: STATE_COLORS[item.state as EmotionalState] }}
                      >
                        {stateLabel(item.state, t)}
                      </span>
                      <span
                        className={cn(
                          "font-bold",
                          isUp ? "text-amber-400" : "text-emerald-400",
                        )}
                      >
                        {isUp ? "+" : ""}
                        {item.changePercent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Concordância modelo-tutor */}
          {modelAgreement && (
            <div className="flex items-center gap-3">
              <Handshake size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-foreground">
                  {language === "pt"
                    ? `O modelo concordou com ${Math.round(modelAgreement.rate * 100)}% das tuas confirmações`
                    : `The model agreed with ${Math.round(modelAgreement.rate * 100)}% of your confirmations`}
                </p>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(modelAgreement.rate * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 border-t border-border/50 pt-2">
        {language === "pt"
          ? "Padrões observados a partir dos teus registos — não é diagnóstico."
          : "Patterns observed from your records — not a diagnosis."}
      </p>
    </div>
  );
}
