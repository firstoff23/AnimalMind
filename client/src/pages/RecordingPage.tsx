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

// ─── Recording Page ───────────────────────────────────────────────────────────

export default function RecordingPage() {
  const [recordState, setRecordState] = useState<RecordingState>("idle");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const { sendNotification } = useNotifications();
  const {
    level: liveAudioLevel,
    waveform: liveWaveform,
    isStreaming: isLiveAudioStreaming,
    start: startLiveAudio,
    stop: stopLiveAudio,
    stopAndGetBlob: stopAndGetBlobLiveAudio,
  } = useLiveAudioStream();

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoRecordingTimer, setAutoRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  const isAutoModeRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const utils = trpc.useUtils();
  const { data: activeAnimalData } = trpc.animals.getActive.useQuery();
  const { data: recentEventsData = [] } = trpc.events.recent.useQuery({ limit: 5 });
  const { data: settingsData } = trpc.settings.get.useQuery();
  const activeAnimal = activeAnimalData as ActiveAnimal | null | undefined;
  const recentEvents = recentEventsData as RecentEvent[];

  const startRecordingCycle = async () => {
    setRecordState("requesting");
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

  const disableAutoMode = () => {
    setIsAutoMode(false);
    isAutoModeRef.current = false;
    if (autoRecordingTimer) {
      clearTimeout(autoRecordingTimer);
      setAutoRecordingTimer(null);
    }
    stopLiveAudio();
    setRecordState("idle");
    toast.info("Modo Automático desligado.");
  };

  const enableAutoMode = () => {
    setIsAutoMode(true);
    isAutoModeRef.current = true;
    setResult(null);
    startRecordingCycle();
    toast.success("Modo Automático ativado!");
  };

  const classifyMutation = trpc.classify.run.useMutation({
    onSuccess: (data) => {
      const res = data as ClassifyResult;
      setResult(res);
      utils.events.recent.invalidate();

      // Check for critical states
      if (activeAnimal && (res.state === "distress" || res.state === "hunger")) {
        sendNotification(
          res.state,
          res.confidence,
          activeAnimal.name,
          String(activeAnimal.id),
          settingsData?.alertSensitivity ?? "medium",
          settingsData?.notificationsEnabled ?? true
        );
      }

      if (isAutoModeRef.current) {
        setRecordState("idle");
        const timer = setTimeout(() => {
          if (isAutoModeRef.current) {
            startRecordingCycle();
          }
        }, 1500);
        setAutoRecordingTimer(timer);
      } else {
        setRecordState("idle");
      }
    },
    onError: () => {
      stopLiveAudio();
      if (isAutoModeRef.current) {
        setRecordState("idle");
        toast.error("Erro na classificação automática. A tentar novamente em 2 segundos...");
        const timer = setTimeout(() => {
          if (isAutoModeRef.current) {
            startRecordingCycle();
          }
        }, 2000);
        setAutoRecordingTimer(timer);
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
            });
          })();
          
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAnimal?.id, recordState, stopAndGetBlobLiveAudio, classifyMutation]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (autoRecordingTimer) clearTimeout(autoRecordingTimer);
    };
  }, [autoRecordingTimer]);

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
        <ResultCard
          result={result}
          onFeedback={(feedback) => {
            if (result.eventId) {
              feedbackMutation.mutate({ eventId: result.eventId, feedback });
            }
          }}
        />
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
        <div className="flex items-center gap-3">
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
              {isAutoMode ? "A escutar e classificar continuamente" : "Permite classificar sem interrupções"}
            </p>
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
          {isAutoMode ? "DESATIVAR" : "ATIVAR"}
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
