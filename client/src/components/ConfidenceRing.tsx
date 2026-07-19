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

function getConfidenceColor(percent: number) {
  if (percent >= 80) return "#10b981";
  if (percent >= 60) return "#eab308";
  return "#ef4444";
}

function toPercent(confidence: number) {
  return Math.min(100, Math.max(0, Math.round(confidence * 100)));
}

function getConfidenceLevelText(percent: number) {
  if (percent >= 80) return "High";
  if (percent >= 60) return "Medium";
  return "Low";
}

function getContextualPrefix(percent: number) {
  if (percent >= 80) return "Seems like";
  if (percent >= 60) return "May be feeling";
  return "Might be";
}

export function ConfidenceRing({
  confidence,
  emoji,
  state,
}: ConfidenceRingProps) {
  const { t } = useLanguage();
  const percent = toPercent(confidence);
  const color = getConfidenceColor(percent);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex items-center justify-center"
        role="progressbar"
        aria-label={`Confiança da classificação: ${percent}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <svg
          className="-rotate-90 drop-shadow-sm"
          viewBox="0 0 112 112"
          aria-hidden="true"
          style={{ width: "8rem", height: "8rem" }}
        >
          <circle
            className="text-secondary"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="56"
            cy="56"
          />
          <circle
            className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke={color}
            fill="transparent"
            r={radius}
            cx="56"
            cy="56"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center gap-0 animate-in zoom-in duration-500">
          <span
            className="font-bold tracking-normal uppercase text-sm mt-1"
            style={{ color }}
          >
            {getConfidenceLevelText(percent)}
          </span>
          <span
            className="leading-none drop-shadow-sm mt-1"
            style={{ fontSize: "2.25rem" }}
            aria-hidden="true"
          >
            {emoji}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          {getContextualPrefix(percent)}
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
