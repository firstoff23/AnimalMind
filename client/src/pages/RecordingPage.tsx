import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { LiveAudioMeter } from "@/components/LiveAudioMeter";
import { Mic, MicOff, ThumbsUp, ThumbsDown, Clock, Infinity } from "lucide-react";
import { toast } from "sonner";
import { useLiveAudioStream } from "@/hooks/useLiveAudioStream";
import { useNotifications } from "@/hooks/useNotifications";
import { STATE_LABELS, STATE_COLORS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

type RecordingState = "idle" | "requesting" | "recording" | "processing";

interface ClassifyResult {
  state: EmotionalState;
  confidence: number;
  emoji: string;
  model_used: string;
  cached: boolean;
  eventId?: number;
  posture?: string | null;
  beliefState?: any;
}

interface ActiveAnimal {
  id: number;
  name: string;
  species: "dog" | "cat";
}

interface RecentEvent {
  id: number;
  state: string;
  confidence: number;
  emoji: string;
  modelUsed: string;
  createdAt: Date;
}

// ─── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onFeedback,
}: {
  result: ClassifyResult;
  onFeedback: (feedback: "correct" | "incorrect") => void;
}) {
  const [feedbackSent, setFeedbackSent] = useState<"correct" | "incorrect" | null>(null);
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const utils = trpc.useUtils();
  const updateNotesMutation = trpc.events.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Nota gravada com sucesso!");
      utils.events.recent.invalidate();
    },
    onError: () => {
      toast.error("Erro ao guardar a nota.");
    },
  });

  const handleFeedback = (f: "correct" | "incorrect") => {
    setFeedbackSent(f);
    onFeedback(f);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("O reconhecimento de voz não é suportado neste navegador.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "pt-PT";

    rec.onstart = () => {
      setIsListening(true);
      toast.info("A ouvir... fale agora.");
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setNotes((prev) => (prev ? prev + " " + transcript : transcript));
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
      if (e.error !== "no-speech") {
        toast.error("Erro ao reconhecer voz. Tente novamente.");
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const handleSaveNotes = () => {
    if (result.eventId) {
      updateNotesMutation.mutate({ eventId: result.eventId, notes });
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter">
      {/* Confidence Ring visual */}
      <ConfidenceRing 
        confidence={result.confidence} 
        emoji={result.emoji} 
        state={result.state} 
      />

      {/* Model badge */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="text-xs uppercase tracking-wide">
          {result.model_used}
        </Badge>
      </div>

      {/* Feedback buttons */}
      <div className="flex gap-3">
        <Button
          variant={feedbackSent === "correct" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => handleFeedback("correct")}
          disabled={feedbackSent !== null}
        >
          <ThumbsUp size={16} />
          Correcto
        </Button>
        <Button
          variant={feedbackSent === "incorrect" ? "destructive" : "outline"}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => handleFeedback("incorrect")}
          disabled={feedbackSent !== null}
        >
          <ThumbsDown size={16} />
          Incorrecto
        </Button>
      </div>

      {/* Notes / Dictation section */}
      <div className="space-y-2 pt-3 border-t border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Nota de Observação
        </label>
        <div className="flex gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: O cão ladrou para a porta..."
            className="flex-1 min-h-[56px] max-h-24 bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none transition-colors"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleListening}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
              isListening 
                ? "bg-cyan-500 hover:bg-cyan-600 border-0 text-white animate-pulse shadow-md shadow-cyan-500/20" 
                : "hover:text-cyan-400 hover:border-cyan-500/20"
            )}
            title="Ditar nota"
          >
            <Mic size={16} className={cn(isListening && "scale-110")} />
          </Button>
        </div>
        {notes.trim().length > 0 && (
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={updateNotesMutation.isPending}
            className="w-full text-xs font-semibold h-8 rounded-xl transition-all"
          >
            {updateNotesMutation.isPending ? "A guardar..." : "Guardar Nota"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ event }: { event: { state: string; confidence: number; emoji: string; modelUsed: string; createdAt: Date } }) {
  const state = event.state as EmotionalState;
  const pct = Math.round(event.confidence * 100);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-2xl">{event.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: STATE_COLORS[state] }}>
          {STATE_LABELS[state]}
        </p>
        <p className="text-xs text-muted-foreground">{event.modelUsed}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{pct}%</p>
        <p className="text-xs text-muted-foreground">
          {new Date(event.createdAt).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton Templates and Types for YOLOv8 Simulation ──────────────────────
interface Point {
  x: number;
  y: number;
}

const SKELETON_TEMPLATES: Record<string, Record<string, Point>> = {
  sitting: {
    nose: { x: 160, y: 55 },
    leftEye: { x: 153, y: 48 },
    rightEye: { x: 167, y: 48 },
    leftEar: { x: 135, y: 40 },
    rightEar: { x: 185, y: 40 },
    neck: { x: 160, y: 85 },
    shoulder: { x: 160, y: 120 },
    elbow: { x: 140, y: 165 },
    frontPaw: { x: 140, y: 215 },
    backHip: { x: 110, y: 180 },
    backPaw: { x: 110, y: 215 },
    tailBase: { x: 90, y: 190 },
    tailTip: { x: 60, y: 200 }
  },
  lying: {
    nose: { x: 220, y: 160 },
    leftEye: { x: 213, y: 153 },
    rightEye: { x: 227, y: 153 },
    leftEar: { x: 195, y: 145 },
    rightEar: { x: 245, y: 145 },
    neck: { x: 180, y: 175 },
    shoulder: { x: 150, y: 185 },
    elbow: { x: 140, y: 200 },
    frontPaw: { x: 160, y: 215 },
    backHip: { x: 90, y: 195 },
    backPaw: { x: 100, y: 215 },
    tailBase: { x: 70, y: 200 },
    tailTip: { x: 45, y: 205 }
  },
  standing: {
    nose: { x: 220, y: 80 },
    leftEye: { x: 213, y: 73 },
    rightEye: { x: 227, y: 73 },
    leftEar: { x: 195, y: 65 },
    rightEar: { x: 245, y: 65 },
    neck: { x: 185, y: 100 },
    shoulder: { x: 165, y: 130 },
    elbow: { x: 165, y: 170 },
    frontPaw: { x: 165, y: 215 },
    backHip: { x: 95, y: 130 },
    backPaw: { x: 95, y: 215 },
    tailBase: { x: 75, y: 130 },
    tailTip: { x: 50, y: 155 }
  },
  alert: {
    nose: { x: 225, y: 70 },
    leftEye: { x: 218, y: 63 },
    rightEye: { x: 232, y: 63 },
    leftEar: { x: 200, y: 55 },
    rightEar: { x: 250, y: 55 },
    neck: { x: 190, y: 90 },
    shoulder: { x: 170, y: 120 },
    elbow: { x: 170, y: 165 },
    frontPaw: { x: 170, y: 215 },
    backHip: { x: 105, y: 120 },
    backPaw: { x: 105, y: 215 },
    tailBase: { x: 85, y: 120 },
    tailTip: { x: 85, y: 45 } // tail straight up!
  }
};

// ─── Recording Page ───────────────────────────────────────────────────────────

export default function RecordingPage() {
  const [recordState, setRecordState] = useState<RecordingState>("idle");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const {
    requestNotificationPermission,
    sendClassificationNotification,
    sendNotification,
  } = useNotifications();
  const {
    level: liveAudioLevel,
    waveform: liveWaveform,
    isStreaming: isLiveAudioStreaming,
    start: startLiveAudio,
    stop: stopLiveAudio,
    stopAndGetBlob: stopAndGetBlobLiveAudio,
  } = useLiveAudioStream();

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoClassificationCount, setAutoClassificationCount] = useState(0);
  const [lastAutoResult, setLastAutoResult] = useState<ClassifyResult | null>(null);

  const isAutoModeRef = useRef(false);
  const autoRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef(false);

  // Vision state hooks
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [detectedPosture, setDetectedPosture] = useState<string>("sitting");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const utils = trpc.useUtils();
  const { data: activeAnimalData } = trpc.animals.getActive.useQuery();
  const { data: recentEventsData = [] } = trpc.events.recent.useQuery({ limit: 5 });
  const { data: settingsData } = trpc.settings.get.useQuery();
  const activeAnimal = activeAnimalData as ActiveAnimal | null | undefined;
  const recentEvents = recentEventsData as RecentEvent[];

  // Manage WebRTC stream
  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 320, 
          height: 240,
          facingMode: { ideal: facingMode }
        } 
      })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error(err));
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          toast.error("Não foi possível aceder à câmara.");
          setShowCamera(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, facingMode]);

  // YOLOv8 simulated skeleton canvas loop
  useEffect(() => {
    if (!showCamera) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const template = SKELETON_TEMPLATES[detectedPosture] || SKELETON_TEMPLATES.sitting;
      const points: Record<string, Point> = {};
      const time = Date.now() * 0.005;
      
      Object.entries(template).forEach(([name, pt]) => {
        const amp = (detectedPosture === "alert" && name === "tailTip") ? 8 : 2;
        const speed = (detectedPosture === "alert" && name === "tailTip") ? 3 : 1;
        const dx = Math.sin(time * speed + pt.x) * amp;
        const dy = Math.cos(time * speed + pt.y) * amp;
        points[name] = { x: pt.x + dx, y: pt.y + dy };
      });

      // Draw skeleton lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // emerald
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawLine = (p1?: Point, p2?: Point) => {
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      };

      // Connect head
      drawLine(points.leftEar, points.leftEye);
      drawLine(points.leftEye, points.nose);
      drawLine(points.nose, points.rightEye);
      drawLine(points.rightEye, points.rightEar);
      drawLine(points.nose, points.neck);

      // Spine & Leg
      drawLine(points.neck, points.shoulder);
      drawLine(points.shoulder, points.elbow);
      drawLine(points.elbow, points.frontPaw);
      drawLine(points.shoulder, points.backHip);
      drawLine(points.backHip, points.backPaw);

      // Tail
      drawLine(points.backHip, points.tailBase);
      drawLine(points.tailBase, points.tailTip);

      // Draw joints (Keypoints)
      Object.entries(points).forEach(([name, pt]) => {
        ctx.beginPath();
        if (name === "nose") {
          ctx.fillStyle = "#ec4899"; // Pink nose
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = "#10b981"; // Emerald joints
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        }
        ctx.fill();
        
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Calculate Bounding Box
      const xs = Object.values(points).map(p => p.x);
      const ys = Object.values(points).map(p => p.y);
      const minX = Math.min(...xs) - 15;
      const maxX = Math.max(...xs) + 15;
      const minY = Math.min(...ys) - 15;
      const maxY = Math.max(...ys) + 15;

      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.fillText(`YOLOv8: ${detectedPosture.toUpperCase()}`, minX + 5, minY - 5);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [showCamera, detectedPosture]);

  const startRecordingCycle = async () => {
    setRecordState("requesting");
    await requestNotificationPermission();
    const started = await startLiveAudio();
    if (!started) {
      setRecordState("idle");
      setIsAutoMode(false);
      isAutoModeRef.current = false;
      toast.error("Não foi possível aceder ao microfone. Modo Automático desativado.");
      return;
    }
    setRecordState("recording");
  };

  const clearAutoRecordingTimer = () => {
    if (autoRecordingTimerRef.current) {
      clearTimeout(autoRecordingTimerRef.current);
      autoRecordingTimerRef.current = null;
    }
  };

  const scheduleAutoRecording = (delayMs: number) => {
    clearAutoRecordingTimer();
    autoRecordingTimerRef.current = setTimeout(() => {
      autoRecordingTimerRef.current = null;
      if (isAutoModeRef.current) {
        startRecordingCycle();
      }
    }, delayMs);
  };

  const disableAutoMode = () => {
    setIsAutoMode(false);
    isAutoModeRef.current = false;
    clearAutoRecordingTimer();
    stopLiveAudio();
    setRecordState("idle");
    toast.info("Modo Automático desligado.");
  };

  const enableAutoMode = () => {
    setIsAutoMode(true);
    isAutoModeRef.current = true;
    setAutoClassificationCount(0);
    setLastAutoResult(null);
    setResult(null);
    clearAutoRecordingTimer();
    startRecordingCycle();
    toast.success("Modo Automático ativado!");
  };

  const classifyMutation = trpc.classify.run.useMutation({
    onSuccess: (data) => {
      const res = data as ClassifyResult;
      setResult(res);
      utils.events.recent.invalidate();
      sendClassificationNotification(
        res.state,
        res.confidence,
        activeAnimal?.name,
        res.eventId
      );

      // Check for critical states
      if (activeAnimal && (res.state === "distress" || res.state === "hunger")) {
        sendNotification(
          res.state,
          res.confidence,
          activeAnimal.name,
          String(activeAnimal.id),
          settingsData?.alertSensitivity ?? "medium",
          settingsData?.notificationsEnabled ?? true,
          false
        );
      }

      if (isAutoModeRef.current) {
        setAutoClassificationCount((count) => count + 1);
        setLastAutoResult(res);
        setRecordState("idle");
        scheduleAutoRecording(1500);
      } else {
        setRecordState("idle");
      }
    },
    onError: () => {
      stopLiveAudio();
      if (isAutoModeRef.current) {
        setRecordState("idle");
        toast.error("Erro na classificação automática. A tentar novamente em 2 segundos...");
        scheduleAutoRecording(2000);
      } else {
        setRecordState("idle");
        toast.error("Erro ao classificar o áudio. Tente novamente.");
      }
    },
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => toast.success("Obrigado pelo feedback!"),
  });

  // Countdown timer during recording
  useEffect(() => {
    if (recordState !== "recording") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setRecordState("processing");
          
          void (async () => {
            let audioBase64: string | undefined = undefined;
            let audioMimeType: string | undefined = undefined;
            
            try {
              const res = await stopAndGetBlobLiveAudio();
              if (res) {
                audioMimeType = res.mimeType;
                const base64Promise = new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    resolve(dataUrl.split(",")[1]);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(res.blob);
                });
                audioBase64 = await base64Promise;
              }
            } catch (err) {
              console.error("Failed to capture recorded audio:", err);
            }
            
            classifyMutation.mutate({ 
              animalId: activeAnimal?.id,
              audio: audioBase64,
              audioMimeType,
              posture: showCamera ? detectedPosture : undefined,
            });
          })();
          
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAnimal?.id, recordState, stopAndGetBlobLiveAudio, classifyMutation, showCamera, detectedPosture]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      clearAutoRecordingTimer();
      stopLiveAudio();
    };
  }, [stopLiveAudio]);

  const handleButtonClick = () => {
    if (isAutoModeRef.current) {
      disableAutoMode();
      return;
    }

    if (recordState === "recording" || recordState === "requesting" || recordState === "processing") {
      stopLiveAudio();
      setRecordState("idle");
      return;
    }

    setResult(null);
    startRecordingCycle();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isAutoModeRef.current) return;
    if (recordState !== "idle") return;

    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      enableAutoMode();
    }, 700);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    if (isLongPressActiveRef.current) {
      e.preventDefault();
      return;
    }

    if (recordState === "idle" || isAutoModeRef.current) {
      handleButtonClick();
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const buttonColor = isAutoMode
    ? "bg-gradient-to-tr from-cyan-500 to-blue-600 auto-pulse shadow-lg shadow-cyan-500/20 text-white"
    : recordState === "idle"
    ? "bg-primary hover:bg-emerald-600 text-white"
    : recordState === "recording"
    ? "bg-red-500 record-pulse text-white"
    : recordState === "requesting"
    ? "bg-slate-600 text-white"
    : "bg-yellow-500 text-white";

  const renderButtonContent = () => {
    if (recordState === "requesting") {
      return (
        <>
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">A ligar…</span>
        </>
      );
    }
    if (recordState === "processing") {
      return (
        <>
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">A analisar…</span>
        </>
      );
    }
    if (recordState === "recording") {
      return (
        <>
          <MicOff size={40} strokeWidth={1.5} />
          <span className="text-3xl font-bold">{countdown}</span>
        </>
      );
    }
    if (isAutoMode) {
      return (
        <>
          <Infinity size={40} strokeWidth={1.5} className="animate-pulse text-cyan-200" />
          <span className="text-sm font-semibold tracking-wider">AUTO</span>
        </>
      );
    }
    return (
      <>
        <Mic size={40} strokeWidth={1.5} />
        <span className="text-sm font-semibold tracking-wider">Gravar</span>
      </>
    );
  };

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto select-none touch-callout-none">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">AnimalMind</h1>
        {activeAnimal ? (
          <p className="text-sm text-muted-foreground">
            {activeAnimal.species === "dog" ? "🐕" : "🐈"} {activeAnimal.name}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum animal seleccionado</p>
        )}
      </div>

      {/* Módulo de Visão Computacional */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">📷</span>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Visão Computacional (YOLOv8)
              </p>
              <p className="text-xs text-muted-foreground">
                Estimar postura para contexto temporal
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {showCamera && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
                className="text-xs font-semibold"
              >
                {facingMode === "environment" ? "FRONTAL" : "TRASEIRA"}
              </Button>
            )}
            <Button
              variant={showCamera ? "destructive" : "outline"}
              size="sm"
              onClick={() => setShowCamera(prev => !prev)}
              className="text-xs font-semibold"
            >
              {showCamera ? "DESATIVAR" : "ATIVAR"}
            </Button>
          </div>
        </div>

        {showCamera && (
          <div className="space-y-3 pt-2 border-t border-border/50 page-enter">
            <div className="relative w-full max-w-[320px] mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-black border border-border">
              <video
                ref={videoRef}
                muted
                playsInline
                className={cn("w-full h-full object-cover", facingMode === "user" && "scale-x-[-1]")}
              />
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className={cn("absolute inset-0 w-full h-full pointer-events-none", facingMode === "user" && "scale-x-[-1]")}
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 bg-secondary/30 p-2.5 rounded-xl border border-border/40">
              <span className="text-xs font-medium text-muted-foreground">
                Simular Postura:
              </span>
              <select
                value={detectedPosture}
                onChange={(e) => setDetectedPosture(e.target.value)}
                className="bg-card text-xs font-semibold text-foreground border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="sitting">Sentado (Relaxado/Atenção)</option>
                <option value="lying">Deitado (Repouso/Submisso)</option>
                <option value="standing">De Pé (Alerta/Neutro)</option>
                <option value="alert">Alerta (Cauda Ereta - Excitação/Perigo)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Recording button */}
      <div className="flex flex-col items-center gap-4">
        {/* Instruction text above button */}
        <div className="h-8 flex items-center justify-center">
          {isAutoMode ? (
            <p className="text-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse text-center">
              Auto Classify está ligado
            </p>
          ) : recordState === "recording" ? (
            <p className="text-sm text-muted-foreground text-center">
              A gravar e analisar o sinal em tempo real…
            </p>
          ) : recordState === "processing" ? (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              A analisar dados acústicos com IA…
            </p>
          ) : recordState === "requesting" ? (
            <p className="text-sm text-muted-foreground text-center">
              A pedir acesso ao microfone…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Premir continuamente para Auto Classify
            </p>
          )}
        </div>

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          disabled={recordState === "requesting" || recordState === "processing"}
          className={cn(
            "w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2",
            "font-semibold shadow-2xl transition-all duration-300",
            "active:scale-95 disabled:cursor-not-allowed",
            buttonColor
          )}
          aria-label="Iniciar gravação"
        >
          {renderButtonContent()}
        </button>

        <p className="text-xs text-muted-foreground text-center h-4">
          {isAutoMode && recordState === "idle" && "Próxima análise acústica a iniciar em breve…"}
          {!isAutoMode && recordState === "idle" && "Toque para uma gravação única de 3 segundos"}
        </p>

        {(recordState === "recording" || isLiveAudioStreaming) && (
          <LiveAudioMeter
            level={liveAudioLevel}
            waveform={liveWaveform}
            isActive={isLiveAudioStreaming}
          />
        )}
      </div>

      {/* Result card */}
      {result && (
        <div className="space-y-4">
          {result.posture && (
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
                Postura Estimada: {result.posture.toUpperCase()}
              </Badge>
            </div>
          )}
          <ResultCard
            result={result}
            onFeedback={(feedback) => {
              if (result.eventId) {
                feedbackMutation.mutate({ eventId: result.eventId, feedback });
              }
            }}
          />
        </div>
      )}

      {/* Banner de Modo Contínuo (Shazam Style) */}
      <div 
        className={cn(
          "border rounded-2xl p-4 flex items-center justify-between transition-all duration-300",
          isAutoMode 
            ? "bg-cyan-950/20 border-cyan-500/20 shadow-md shadow-cyan-950/10" 
            : "bg-card border-border"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div 
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300",
              isAutoMode ? "bg-cyan-500/10 text-cyan-400" : "bg-muted text-muted-foreground"
            )}
          >
            <Infinity size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Modo contínuo
            </p>
            <p className="text-xs text-muted-foreground">
              {isAutoMode
                ? `${autoClassificationCount} classificações nesta sessão`
                : "Permite classificar sem interrupções"}
            </p>
            {isAutoMode && lastAutoResult && (
              <p className="text-[11px] text-cyan-300 mt-1 truncate max-w-[220px]">
                Última: {lastAutoResult.emoji}{" "}
                {STATE_LABELS[lastAutoResult.state]} ·{" "}
                {Math.round(lastAutoResult.confidence * 100)}%
              </p>
            )}
          </div>
        </div>
        <Button
          variant={isAutoMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "text-xs font-semibold transition-all duration-300",
            isAutoMode 
              ? "bg-cyan-500 hover:bg-cyan-600 text-white border-0 shadow-sm"
              : "hover:bg-cyan-500/5 hover:text-cyan-400 hover:border-cyan-500/30"
          )}
          onClick={isAutoMode ? disableAutoMode : enableAutoMode}
        >
          {isAutoMode ? "PARAR" : "ATIVAR"}
        </Button>
      </div>

      {/* Recent history */}
      {recentEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Últimas classificações
            </h2>
          </div>
          {recentEvents.map((event) => (
            <HistoryItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
