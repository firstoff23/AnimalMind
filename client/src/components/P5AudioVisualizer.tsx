import React, { Suspense, useEffect, useState, useRef } from "react";

// Colors requested by USER:
// happy=verde (#22c55e), calm=azul (#6366f1), anxious=laranja (#f97316), aggressive=vermelho (#ef4444), neutral=cinzento (#94a3b8)
const EMOTION_COLORS: Record<string, string> = {
  happy: "#22c55e",
  calm: "#6366f1",
  anxious: "#f97316",
  aggressive: "#ef4444",
  neutral: "#94a3b8",
  // Map our model states to these:
  excitement: "#22c55e", // happy
  relaxed: "#6366f1", // calm
  hunger: "#f97316", // anxious
  attention: "#f97316", // anxious
  distress: "#ef4444", // aggressive
  alert: "#ef4444", // aggressive
};

function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion.toLowerCase()] || EMOTION_COLORS.neutral;
}

interface P5AudioVisualizerProps {
  emotion: string;
  waveform: number[];
  isActive: boolean;
  level: number;
}

function SketchWrapper({ emotion, waveform, isActive, level }: { emotion: string; waveform: number[]; isActive: boolean; level: number }) {
  const [SketchComponent, setSketchComponent] = useState<any>(null);
  
  useEffect(() => {
    import("react-p5").then((mod) => {
      setSketchComponent(() => mod.default);
    });
  }, []);

  const waveformRef = useRef<number[]>(waveform);
  const colorRef = useRef<string>(getEmotionColor(emotion));
  const isActiveRef = useRef<boolean>(isActive);
  const levelRef = useRef<number>(level);

  useEffect(() => {
    waveformRef.current = waveform;
  }, [waveform]);

  useEffect(() => {
    colorRef.current = getEmotionColor(emotion);
  }, [emotion]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const currentWaveform = useRef<number[]>(Array.from({ length: 16 }, () => 0));

  const setup = (p5: any, canvasParentRef: Element) => {
    p5.createCanvas(canvasParentRef.clientWidth || 320, 100).parent(canvasParentRef);
    p5.frameRate(60);
  };

  const draw = (p5: any) => {
    p5.clear();
    p5.background(24, 31, 46, 180);

    const targetWave = waveformRef.current;
    const isAct = isActiveRef.current;
    const col = colorRef.current;

    for (let i = 0; i < 16; i++) {
      const targetVal = isAct && targetWave[i] !== undefined ? targetWave[i] : 0.05;
      currentWaveform.current[i] = p5.lerp(currentWaveform.current[i], targetVal, 0.15);
    }

    p5.stroke(255, 255, 255, 10);
    p5.strokeWeight(1);
    p5.line(0, p5.height / 2, p5.width, p5.height / 2);

    p5.noFill();
    p5.stroke(col);
    p5.strokeWeight(3.5);
    p5.strokeJoin(p5.ROUND);
    p5.strokeCap(p5.ROUND);

    p5.beginShape();
    p5.vertex(0, p5.height / 2);

    const step = p5.width / 15;
    
    for (let i = 0; i < 16; i++) {
      const x = i * step;
      const amp = currentWaveform.current[i] * (p5.height * 0.45);
      const y = p5.height / 2 - amp;
      p5.curveVertex(x, y);
    }
    
    p5.vertex(p5.width, p5.height / 2);
    p5.endShape();

    p5.beginShape();
    p5.vertex(0, p5.height / 2);
    for (let i = 0; i < 16; i++) {
      const x = i * step;
      const amp = currentWaveform.current[i] * (p5.height * 0.45);
      const y = p5.height / 2 + amp;
      p5.curveVertex(x, y);
    }
    p5.vertex(p5.width, p5.height / 2);
    p5.endShape();

    if (isAct) {
      p5.noStroke();
      p5.fill(col);
      for (let i = 0; i < 16; i += 2) {
        const x = i * step;
        const amp = currentWaveform.current[i] * (p5.height * 0.45);
        p5.ellipse(x, p5.height / 2 - amp, 5, 5);
        p5.ellipse(x, p5.height / 2 + amp, 5, 5);
      }
    }
  };

  const windowResized = (p5: any) => {
    const parent = p5.canvas.parentElement;
    if (parent) {
      p5.resizeCanvas(parent.clientWidth, 100);
    }
  };

  if (!SketchComponent) {
    return (
      <div className="w-full h-[100px] flex items-center justify-center bg-slate-900/50 rounded-xl text-xs text-muted-foreground animate-pulse">
        Inicializando visualizador p5.js...
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-slate-900/40">
      <SketchComponent setup={setup} draw={draw} windowResized={windowResized} />
    </div>
  );
}

export function P5AudioVisualizer({ emotion, waveform, isActive, level }: P5AudioVisualizerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[100px] flex items-center justify-center bg-slate-900/50 rounded-xl text-xs text-muted-foreground">
        A carregar visualizador...
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="w-full h-[100px] flex items-center justify-center bg-slate-900/50 rounded-xl text-xs text-muted-foreground">
        A carregar canvas p5.js...
      </div>
    }>
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold px-1 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full animate-pulse"
              style={{
                backgroundColor: isActive ? getEmotionColor(emotion) : "#475569",
                boxShadow: isActive ? `0 0 14px ${getEmotionColor(emotion)}` : "none",
                transition: "all 0.3s ease",
              }}
            />
            <span>Visualizador p5.js Waveform</span>
          </div>
          {isActive && (
            <span className="text-[11px] capitalize px-2 py-0.5 rounded-full bg-slate-800 text-foreground border border-border">
              {emotion}
            </span>
          )}
        </div>
        <SketchWrapper emotion={emotion} waveform={waveform} isActive={isActive} level={level} />
      </div>
    </Suspense>
  );
}
