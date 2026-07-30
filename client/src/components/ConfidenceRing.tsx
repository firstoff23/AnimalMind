// biome-ignore lint/correctness/noUnusedImports: React is needed for JSX in Vitest
import React from "react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  type EmotionalState,
  STATE_COLORS,
  STATE_LABELS,
} from "../../../shared/types";

interface ConfidenceRingProps {
  confidence: number;
  emoji: string;
  state: EmotionalState;
}

export function ConfidenceRing({
  confidence,
  emoji,
  state,
}: ConfidenceRingProps) {
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  
  // Confidences are 0-1
  let bars = 1;
  let levelEn = "Low";
  let levelPt = "Baixa";
  let color = "bg-rose-500";
  let textColor = "text-rose-500";
  
  if (confidence >= 0.75) {
    bars = 3;
    levelEn = "High";
    levelPt = "Alta";
    color = "bg-emerald-500";
    textColor = "text-emerald-500";
  } else if (confidence >= 0.5) {
    bars = 2;
    levelEn = "Medium";
    levelPt = "Média";
    color = "bg-yellow-500";
    textColor = "text-yellow-500";
  }

  const prefixEn = confidence >= 0.75 ? "Seems like" : confidence >= 0.5 ? "May be feeling" : "Might be";
  const prefixPt = confidence >= 0.75 ? "Parece estar" : confidence >= 0.5 ? "Talvez esteja" : "Poderá estar";
  const prefix = isPt ? prefixPt : prefixEn;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex flex-col items-center justify-center py-6 w-full max-w-[12rem] bg-secondary/20 rounded-full drop-shadow-sm border border-border"
        role="progressbar"
        aria-label={`Confiança: ${isPt ? levelPt : levelEn}`}
      >
        <span
          className="leading-none drop-shadow-sm mb-3"
          style={{ fontSize: "3rem" }}
          aria-hidden="true"
        >
          {emoji}
        </span>
        
        <div className="flex gap-1.5 mb-2">
          <div className={`w-4 h-1.5 rounded-full ${bars >= 1 ? color : 'bg-muted/50'}`} />
          <div className={`w-4 h-1.5 rounded-full ${bars >= 2 ? color : 'bg-muted/50'}`} />
          <div className={`w-4 h-1.5 rounded-full ${bars >= 3 ? color : 'bg-muted/50'}`} />
        </div>
        
        <span
          className={`font-bold tracking-normal uppercase text-xs ${textColor}`}
        >
          {isPt ? levelPt : levelEn}
        </span>
      </div>

      <div className="flex flex-col items-center gap-0 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          {prefix}
        </span>
        <span
          className="text-2xl font-bold tracking-normal mt-1"
          style={{ color: STATE_COLORS[state] }}
        >
          {t(`states.${state}` as any) || STATE_LABELS[state]}
        </span>
      </div>
    </div>
  );
}
