import React from "react";

interface LiveAudioMeterProps {
  level: number;
  waveform: number[];
  isActive: boolean;
}

function percentFromLevel(level: number) {
  return Math.max(0, Math.min(100, Math.round(level * 100)));
}

export function LiveAudioMeter({ level, waveform, isActive }: LiveAudioMeterProps) {
  const percent = percentFromLevel(level);
  const bars = waveform.length > 0 ? waveform : Array.from({ length: 16 }, () => 0);

  return (
    <div
      className="w-full rounded-xl border border-border bg-card/80 px-4 py-3"
      role="meter"
      aria-label="Streaming áudio em tempo real"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: isActive ? "#10b981" : "#475569",
              boxShadow: isActive ? "0 0 14px rgba(16, 185, 129, 0.6)" : "none",
            }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-muted-foreground">
            Streaming áudio em tempo real
          </span>
        </div>
        <span className="text-xs font-semibold text-primary">{percent}%</span>
      </div>

      <div className="flex h-12 items-center gap-1 overflow-hidden" aria-hidden="true">
        {bars.map((bar, index) => {
          const height = Math.max(6, Math.round(bar * 42));
          return (
            <span
              key={index}
              data-audio-bar="true"
              className="flex-1 rounded-full bg-primary/80 transition-[height,opacity] duration-100"
              style={{
                height,
                opacity: isActive ? 0.45 + Math.min(0.55, bar) : 0.25,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
