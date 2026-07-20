import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clock,
  Infinity as InfinityIcon,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { P5AudioVisualizer } from "@/components/P5AudioVisualizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowingButton } from "@/components/ui/GlowingButton";
import { Progress } from "@/components/ui/progress";
import { useHaptic } from "@/hooks/useHaptic";
import { useLanguage } from "@/hooks/useLanguage";
import { useLiveAudioStream } from "@/hooks/useLiveAudioStream";
import { useNotifications } from "@/hooks/useNotifications";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { isBrowserOffline } from "@/lib/offlineQueue";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS, STATE_LABELS } from "../../../shared/types";

type RecordState =
  | "idle"
  | "requesting"
  | "recording"
  | "review"
  | "uploading"
  | "processing"
  | "success"
  | "error";

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
  breed?: string | null;
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
  activeAnimal,
}: {
  result: ClassifyResult;
  onFeedback: (feedback: "correct" | "incorrect") => void;
  activeAnimal: ActiveAnimal | null | undefined;
}) {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [feedbackSent, setFeedbackSent] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [comment, setComment] = useState("");
  const [confirmedState, setConfirmedState] = useState<EmotionalState>(result.state);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  const utils = trpc.useUtils();
  const updateNotesMutation = trpc.events.updateNotes.useMutation({
    onSuccess: () => {
      toast.success(t("recordingPage.noteSaved"));
      utils.events.recent.invalidate();
    },
    onError: () => {
      toast.error(t("recordingPage.noteSaveError"));
    },
  });

  const logAnalyticsMutation = trpc.analytics.logEvent.useMutation();

  const saveFeedback = trpc.feedback.submit.useMutation({
    onSuccess: (data, variables) => {
      toast.success(t("recordingPage.feedbackSuccess"));
      setShowCorrectionForm(false);
      logAnalyticsMutation.mutate({
        eventName: "feedback_detailed",
        properties: {
          classificationEventId: variables.classificationEventId,
          confirmedState: variables.confirmedState,
          comment: variables.comment,
        },
      });
    },
    onError: (err: any) => {
      toast.error("Erro ao guardar feedback: " + err.message);
    },
  });

  const handleFeedback = (f: "correct" | "incorrect") => {
    setFeedbackSent(f);
    onFeedback(f);
    logAnalyticsMutation.mutate({
      eventName: "feedback_quick",
      properties: { type: f, eventId: result.eventId },
    });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(t("recordingPage.speechNotSupported"));
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "pt-PT";

    rec.onstart = () => {
      setIsListening(true);
      toast.info(t("recordingPage.listeningNow"));
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
      if (e.error !== "no-speech") {
        toast.error(t("recordingPage.speechError"));
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

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (result.eventId) {
      saveFeedback.mutate({
        classificationEventId: result.eventId,
        confirmedState: confirmedState,
        comment: comment.trim() || null,
      });
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
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5 page-enter text-left">
      <ConfidenceRing
        confidence={result.confidence}
        emoji={result.emoji}
        state={result.state}
      />

      <div className="text-center mt-0">
        <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest font-medium">
          AI-assisted second opinion, not a diagnosis
        </p>
      </div>

      <div className="flex justify-center mt-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide opacity-50">
          {result.model_used}
        </Badge>
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium text-center text-foreground/90">
          {language === "pt" ? "Fez sentido?" : "Did this make sense?"}
        </p>
        <div className="flex gap-3">
          <Button
            variant={feedbackSent === "correct" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2 disabled:opacity-70 rounded-xl"
            onClick={() => handleFeedback("correct")}
            disabled={feedbackSent !== null}
          >
            <ThumbsUp size={16} />
            {language === "pt" ? "Sim" : "Yes"}
          </Button>
          <Button
            variant={feedbackSent === "incorrect" ? "destructive" : "outline"}
            size="sm"
            className="flex-1 gap-2 disabled:opacity-70 rounded-xl"
            onClick={() => handleFeedback("incorrect")}
            disabled={feedbackSent !== null}
          >
            <ThumbsDown size={16} />
            {language === "pt" ? "Não" : "No"}
          </Button>
        </div>
      </div>

      <div className="pt-3 border-t border-border space-y-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="w-full gap-2 text-xs"
          onClick={() => setShowCorrectionForm(!showCorrectionForm)}
        >
          <Sparkles size={14} />
          {showCorrectionForm ? "Ocultar Correção" : "Confirmar / Corrigir Detalhes"}
        </Button>

        {showCorrectionForm && (
          <form onSubmit={handleSaveFeedback} className="space-y-3 p-3 rounded-xl bg-secondary/20 border border-border">
            <div className="space-y-1">
              <label htmlFor="feedback-comment-input" className="text-xs font-semibold text-muted-foreground block">
                Observações Contextuais (Opcional)
              </label>
              <textarea
                id="feedback-comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Estava a chover, próximo da hora da refeição..."
                className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 min-h-[60px] resize-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmed-state-select" className="text-xs font-semibold text-muted-foreground block">
                Confirmar/Corrigir Estado Emocional
              </label>
              <select
                id="confirmed-state-select"
                value={confirmedState}
                onChange={(e) => setConfirmedState(e.target.value as EmotionalState)}
                className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="relaxed">Relaxado</option>
                <option value="distress">Angústia</option>
                <option value="attention">Atenção</option>
                <option value="excitement">Excitação</option>
                <option value="hunger">Fome</option>
                <option value="alert">Alerta</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full text-xs font-semibold h-8 rounded-xl"
              disabled={saveFeedback.isPending}
            >
              {saveFeedback.isPending ? "A guardar..." : "Submeter Feedback"}
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <label className="text-xs font-semibold text-muted-foreground block text-center">
          {language === "pt" ? "Adicionar contexto rápido" : "Add quick context"}
        </label>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { id: "Playing", en: "Playing", pt: "A brincar" },
            { id: "Alone", en: "Alone", pt: "Sozinho" },
            { id: "Near the door", en: "Near the door", pt: "À porta" },
            { id: "Mealtime", en: "Mealtime", pt: "Hora da refeição" }
          ].map((tag) => {
            const isSelected = notes.includes(tag.id);
            const label = language === "pt" ? tag.pt : tag.en;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setNotes(notes.replace(tag.id, "").replace("  ", " ").trim());
                  } else {
                    setNotes(notes ? `${notes} ${tag.id}` : tag.id);
                  }
                }}
                className={cn(
                  "text-[11px] px-3 py-1.5 rounded-full font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        
        {notes.length > 0 && (
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={updateNotesMutation.isPending}
            className="w-full text-xs font-semibold h-9 rounded-xl transition-all mt-2"
          >
            {updateNotesMutation.isPending
              ? t("recordingPage.saving")
              : t("recordingPage.saveNote")}
          </Button>
        )}

        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/history")}
            className="w-full text-xs text-muted-foreground hover:text-foreground mt-2 font-medium"
          >
            {language === "pt" ? "Ver no diário" : "View in timeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────
function HistoryItem({
  event,
}: {
  event: {
    state: string;
    confidence: number;
    emoji: string;
    modelUsed: string;
    createdAt: Date;
  };
}) {
  const { t } = useLanguage();
  const state = event.state as EmotionalState;
  const pct = Math.round(event.confidence * 100);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 text-left">
      <span className="text-2xl">{event.emoji}</span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: STATE_COLORS[state] }}
        >
          {t(`states.${state}` as any) || STATE_LABELS[state]}
        </p>
        <p className="text-xs text-muted-foreground">{event.modelUsed}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{pct}%</p>
        <p className="text-xs text-muted-foreground font-sans">
          {new Date(event.createdAt).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function LiveWaveformBars({
  active,
  level,
  waveform,
}: {
  active: boolean;
  level: number;
  waveform: number[];
}) {
  const bars =
    waveform.length > 0
      ? waveform.slice(0, 18)
      : Array.from({ length: 18 }, (_, index) => Math.sin(index * 0.9));

  return (
    <div
      className="flex h-16 w-full items-end justify-center gap-1.5 px-2"
      aria-hidden="true"
    >
      {bars.map((sample, index) => {
        const normalized = Math.min(
          1,
          Math.max(0.14, Math.abs(sample) + level * 0.65),
        );
        return (
          <span
            key={`${index}-${sample.toFixed(2)}`}
            className={cn(
              "w-1.5 rounded-full bg-emerald-400/80 transition-all duration-150",
              active && "animate-pulse",
            )}
            style={{
              height: `${Math.round(18 + normalized * 44)}px`,
              opacity: active ? 0.45 + normalized * 0.55 : 0.22,
              animationDelay: `${index * 45}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Recording Page ───────────────────────────────────────────────────────────
export default function RecordingPage() {
  const { t, language } = useLanguage();
  const { setRecording } = useAppStore();
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Review state
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  const {
    requestNotificationPermission,
    sendClassificationNotification,
    sendNotification,
  } = useNotifications();
  const {
    level: liveAudioLevel,
    waveform: liveWaveform,
    isStreaming: isLiveAudioStreaming,
    status: liveAudioStatus,
    start: startLiveAudio,
    stop: stopLiveAudio,
    stopAndGetBlob: stopAndGetBlobLiveAudio,
    stream: liveAudioStream,
  } = useLiveAudioStream();

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoClassificationCount, setAutoClassificationCount] = useState(0);
  const [lastAutoResult, setLastAutoResult] = useState<ClassifyResult | null>(
    null,
  );

  const isAutoModeRef = useRef(false);
  const autoRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef(false);

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const lastRecordedBlobRef = useRef<Blob | null>(null);
  const [dominantFreq, setDominantFreq] = useState<number>(0);
  const [spectralEnergy, setSpectralEnergy] = useState<number>(0);
  const [tonalBrightness, setTonalBrightness] = useState<number>(0);
  


  const utils = trpc.useUtils();
  const { data: activeAnimalData } = trpc.animals.getActive.useQuery();
  const { data: recentEventsData = [] } = trpc.events.recent.useQuery({
    limit: 5,
  });
  const { data: settingsData } = trpc.settings.get.useQuery();
  const { enqueue, pendingCount } = useOfflineQueue({ autoProcess: false });
  const activeAnimal = activeAnimalData as ActiveAnimal | null | undefined;
  const recentEvents = recentEventsData as RecentEvent[];
  const {
    triggerStartRecording,
    triggerStopRecording,
    triggerSaveSuccess,
    triggerCriticalError,
  } = useHaptic();

  useEffect(() => {
    setRecording(recordState === "recording");
  }, [recordState, setRecording]);

  const startRecordingCycle = async () => {
    setRecordState("requesting");
    setErrorMessage(null);
    await requestNotificationPermission();
    const started = await startLiveAudio();
    if (!started) {
      // Permission denied or error
      if (liveAudioStatus === "denied") {
        setRecordState("error");
        setErrorMessage(
          language === "pt"
            ? "Permissão de microfone negada. Ative nas definições."
            : "Microphone permission denied. Enable in settings.",
        );
      } else {
        setRecordState("error");
        setErrorMessage(
          language === "pt"
            ? "Erro ao aceder ao microfone."
            : "Error accessing microphone.",
        );
      }
      triggerCriticalError();
      setIsAutoMode(false);
      isAutoModeRef.current = false;
      return;
    }
    triggerStartRecording();
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
    toast.info(
      language === "pt"
        ? "Modo Automático desligado."
        : "Continuous Mode turned off.",
    );
  };

  const enableAutoMode = () => {
    setIsAutoMode(true);
    isAutoModeRef.current = true;
    setAutoClassificationCount(0);
    setLastAutoResult(null);
    setResult(null);
    setRecordedAudioUrl(null);
    clearAutoRecordingTimer();
    startRecordingCycle();
    toast.success(
      language === "pt"
        ? "Modo Automático ativado!"
        : "Continuous Mode active!",
    );
  };

  const logAnalyticsMutation = trpc.analytics.logEvent.useMutation();

  const handleClassificationResult = (
    res: ClassifyResult,
    offlineMode: boolean,
  ) => {
    setIsOfflineMode(offlineMode);
    setResult(res);

    logAnalyticsMutation.mutate({
      eventName: "recording_success",
      properties: {
        eventId: res.eventId,
        modelUsed: res.model_used || (offlineMode ? "local-tfjs" : "yamnet"),
        confidence: res.confidence,
        cached: res.cached,
        offlineMode,
        contextTags: [],
      },
    });

    if (!offlineMode) {
      // Invalidate all event-related caches so history page and dashboard
      // reflect the new classification immediately when the user navigates.
      utils.events.recent.invalidate();
      utils.events.list.invalidate();
      utils.events.listForAnimal.invalidate();
      utils.events.statsForAnimal.invalidate();
    }

    sendClassificationNotification(
      res.state,
      res.confidence,
      activeAnimal?.name,
      res.eventId,
    );

    if (
      !offlineMode &&
      activeAnimal &&
      (res.state === "distress" || res.state === "hunger")
    ) {
      sendNotification(
        res.state,
        res.confidence,
        activeAnimal.name,
        String(activeAnimal.id),
        settingsData?.alertSensitivity ?? "medium",
        settingsData?.notificationsEnabled ?? true,
        false,
      );
    }

    if (isAutoModeRef.current) {
      setAutoClassificationCount((count) => count + 1);
      setLastAutoResult(res);
      setRecordState("idle");
      scheduleAutoRecording(1500);
    } else {
      triggerSaveSuccess();
      setRecordState("success");
    }
  };

  const runLocalClassification = async (blob: Blob) => {
    toast.info(
      language === "pt"
        ? "A classificar offline com YAMNet local..."
        : "Classifying offline with local YAMNet...",
    );
    const localClassifier = await import("@/lib/localClassifier");
    const localRes = await localClassifier.runLocalYAMNet(blob);

    const res: ClassifyResult = {
      state: localRes.state as EmotionalState,
      confidence: localRes.confidence,
      emoji: localRes.emoji,
      model_used: "yamnet-local",
      cached: false,
      eventId: undefined,
    };

    handleClassificationResult(res, true);
  };

  const classifyMutation = trpc.classify.run.useMutation({
    onSuccess: (data) => {
      const res = data as ClassifyResult;
      handleClassificationResult(res, false);
    },
    onError: async (err) => {
      const lastBlob = lastRecordedBlobRef.current;
      if (lastBlob) {
        try {
          toast.info(
            language === "pt"
              ? "Servidor indisponível. A usar fallback local..."
              : "Server unavailable. Using local fallback...",
          );
          await runLocalClassification(lastBlob);
          return;
        } catch (localErr) {
          console.error("Local TFJS classification failed:", localErr);
        }
      }

      logAnalyticsMutation.mutate({
        eventName: "recording_failure",
        properties: {
          error: err.message,
          fallbackFailed: true,
          contextTags: [],
        },
      });

      setRecordState("error");
      const isNetError =
        !navigator.onLine ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("failed to fetch") ||
        err.message?.toLowerCase().includes("offline");
      setErrorMessage(
        isNetError || language === "pt"
          ? "Ligação interrompida. Tentar novamente."
          : "Connection interrupted. Try again.",
      );
    },
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: (data, variables) => {
      toast.success(t("recordingPage.feedbackSuccess"));
      logAnalyticsMutation.mutate({
        eventName: "feedback_quick",
        properties: {
          eventId: variables.eventId,
          feedback: variables.feedback,
        },
      });
    },
  });

  // Tone.js FFT audio analysis hook
  useEffect(() => {
    if (recordState !== "recording" || !liveAudioStream) {
      return;
    }

    let active = true;
    let analyser: any;
    let micSource: any;
    let animationFrameId: number;

    const startToneAnalysis = async () => {
      try {
        const Tone = await import("tone");

        if (Tone.getContext().state !== "running") {
          await Tone.getContext().resume();
        }

        analyser = new Tone.Analyser("fft", 256);
        micSource = Tone.getContext().createMediaStreamSource(liveAudioStream);
        micSource.connect(analyser);

        const sampleRate = Tone.getContext().sampleRate || 44100;
        const binWidth = sampleRate / 512;

        const analyze = () => {
          if (!active) return;

          const values = analyser.getValue() as Float32Array;
          if (values && values.length > 0) {
            let maxVal = -Infinity;
            let maxIdx = 0;
            let sumEnergy = 0;
            let weightedSum = 0;
            let sumAmp = 0;

            for (let i = 0; i < values.length; i++) {
              const db = values[i];
              const amp = 10 ** (db / 20);
              sumEnergy += amp * amp;
              sumAmp += amp;

              const freq = i * binWidth;
              weightedSum += amp * freq;

              if (db > maxVal) {
                maxVal = db;
                maxIdx = i;
              }
            }

            const domPitch = Math.round(maxIdx * binWidth);
            const energy = Math.round(sumEnergy * 100) / 100;
            const brightness =
              sumAmp > 0 ? Math.round(weightedSum / sumAmp) : 0;

            if (active) {
              setDominantFreq(domPitch);
              setSpectralEnergy(energy);
              setTonalBrightness(brightness);
            }
          }

          animationFrameId = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err) {
        console.error("Failed to run Tone.js frequency analysis:", err);
      }
    };

    startToneAnalysis();

    return () => {
      active = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (micSource) {
        try {
          micSource.disconnect();
        } catch (_e) {}
      }
      if (analyser) {
        try {
          analyser.dispose();
        } catch (_e) {}
      }
    };
  }, [recordState, liveAudioStream]);

  // Countdown timer during recording
  useEffect(() => {
    if (recordState !== "recording") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);

          void (async () => {
            try {
              const res = await stopAndGetBlobLiveAudio();
              if (res) {
                lastRecordedBlobRef.current = res.blob;
                const audioUrl = URL.createObjectURL(res.blob);
                setRecordedAudioUrl(audioUrl);

                // If in Continuous/Auto mode, skip review screen and send immediately
                if (isAutoModeRef.current) {
                  uploadAndProcess(res.blob, res.mimeType);
                } else {
                  setRecordState("review");
                }
              } else {
                setRecordState("idle");
                toast.error(
                  language === "pt"
                    ? "Não foi possível registar o áudio."
                    : "Could not record audio.",
                );
              }
            } catch (err) {
              console.error("Failed to capture recorded audio:", err);
              setRecordState("idle");
            }
          })();

          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recordState, stopAndGetBlobLiveAudio, language, uploadAndProcess]);

  async function uploadAndProcess(blob: Blob, mimeType: string) {
    const ALLOWED_AUDIO = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/m4a",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
    ];

    if (blob.size > 50 * 1024 * 1024) {
      setRecordState("error");
      setErrorMessage(
        language === "pt"
          ? "Ficheiro demasiado grande. Máximo 50 MB."
          : "File too large. Maximum 50 MB.",
      );
      return;
    }

    const checkMime = mimeType || blob.type;
    if (checkMime && !ALLOWED_AUDIO.includes(checkMime.toLowerCase())) {
      setRecordState("error");
      setErrorMessage(
        language === "pt"
          ? "Formato de áudio não suportado."
          : "Unsupported audio format.",
      );
      return;
    }

    setRecordState("uploading");
    setUploadProgress(0);

    // Simulate progress bar (0-100%)
    const duration = 1000;
    const step = 10;
    const increment = 100 / (duration / step);
    let curProgress = 0;

    const interval = setInterval(async () => {
      curProgress = Math.min(100, curProgress + increment);
      setUploadProgress(Math.round(curProgress));

      if (curProgress >= 100) {
        clearInterval(interval);
        setRecordState("processing");

        if (isBrowserOffline()) {
          await enqueue({
            animalId: activeAnimal?.id,
            audioBlob: blob,
            audioMimeType: mimeType,
            pitch: dominantFreq,
            spectralEnergy,
            tonalBrightness,
            timestamp: Date.now(),
          });

          try {
            await runLocalClassification(blob);
          } catch (localErr) {
            console.error("Local classification failed:", localErr);
            setRecordState("error");
            setErrorMessage(
              language === "pt"
                ? "Erro na classificação local."
                : "Error in local classification.",
            );
          }
          return;
        }

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Promise = reader.result as string;
          classifyMutation.mutate({
            animalId: activeAnimal?.id,
            audio: base64Promise.split(",")[1],
            audioMimeType: mimeType,
            pitch: dominantFreq,
            spectralEnergy,
            tonalBrightness,
            contextTags: [],
          });
        };
        reader.readAsDataURL(blob);
      }
    }, step);
  }

  const handleConfirm = () => {
    const blob = lastRecordedBlobRef.current;
    if (blob) {
      uploadAndProcess(blob, blob.type);
    }
  };

  const handleRetry = () => {
    // Delete recorded file preview
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setResult(null);
    setUploadProgress(0);
    setErrorMessage(null);

    setRecordState("idle");
    startRecordingCycle();
  };

  const handleDelete = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setResult(null);
    setUploadProgress(0);
    setErrorMessage(null);
    setRecordState("idle");
  };

  const handlePlayAudio = () => {
    if (!audioPlaybackRef.current) return;
    if (isPlayingAudio) {
      audioPlaybackRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlaybackRef.current.play().catch((err) => console.error(err));
      setIsPlayingAudio(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      clearAutoRecordingTimer();
      stopLiveAudio();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [stopLiveAudio, recordedAudioUrl, clearAutoRecordingTimer]);

  const handleButtonClick = () => {
    if (isAutoModeRef.current) {
      disableAutoMode();
      return;
    }

    if (
      recordState === "recording" ||
      recordState === "requesting" ||
      recordState === "processing"
    ) {
      triggerStopRecording();
      stopLiveAudio();
      setRecordState("idle");
      return;
    }

    setResult(null);
    setRecordedAudioUrl(null);
    startRecordingCycle();
  };

  const handlePointerDown = (_e: React.PointerEvent) => {
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
          <span className="text-xs">{t("recordingPage.connecting")}</span>
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
          <InfinityIcon
            size={40}
            strokeWidth={1.5}
            className="animate-pulse text-cyan-200"
          />
          <span className="text-sm font-semibold tracking-wider">AUTO</span>
        </>
      );
    }
    return (
      <>
        <Mic size={40} strokeWidth={1.5} />
        <span className="text-sm font-semibold tracking-wider">
          {t("recordingPage.record")}
        </span>
      </>
    );
  };

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto select-none touch-callout-none">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Pawra</h1>
        {activeAnimal ? (
          <p className="text-sm text-muted-foreground">{activeAnimal.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("header.noAnimal")}
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Review Screen View */}
        {recordState === "review" && recordedAudioUrl && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-lg text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Volume2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {language === "pt"
                    ? "Gravação Concluída"
                    : "Recording Completed"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt"
                    ? "Reveja o som antes de analisar"
                    : "Review the sound before analyzing"}
                </p>
              </div>
            </div>

            {/* Audio tag & Play controls */}
            <audio
              ref={audioPlaybackRef}
              src={recordedAudioUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            <div
              onClick={handlePlayAudio}
              className="bg-secondary/40 border border-border/40 hover:bg-secondary/60 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all active-scale"
            >
              <div className="flex items-center gap-2.5">
                {isPlayingAudio ? (
                  <Pause
                    size={18}
                    className="text-primary fill-primary animate-pulse"
                  />
                ) : (
                  <Play size={18} className="text-primary fill-primary" />
                )}
                <span className="text-xs font-semibold text-foreground">
                  {isPlayingAudio
                    ? language === "pt"
                      ? "A reproduzir áudio..."
                      : "Playing audio..."
                    : language === "pt"
                      ? "Ouvir gravação"
                      : "Listen to recording"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">
                3s
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="flex-1 text-xs font-semibold h-11 border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 size={14} className="mr-1.5" />
                {language === "pt" ? "Eliminar" : "Delete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRetry}
                className="flex-1 text-xs font-semibold h-11 border-white/10 text-foreground hover:bg-white/5"
              >
                <RefreshCw size={14} className="mr-1.5" />
                {language === "pt" ? "Repetir" : "Retry"}
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 text-xs font-semibold h-11 bg-primary text-primary-foreground hover:bg-emerald-600 shadow-md shadow-primary/20"
              >
                <Check size={14} className="mr-1.5" />
                {language === "pt" ? "Confirmar" : "Confirm"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Upload progress & Processing views */}
        {(recordState === "uploading" || recordState === "processing") && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg min-h-[160px]"
            aria-live="polite"
          >
            {recordState === "uploading" ? (
              <>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2.5">
                  {language === "pt"
                    ? "A enviar gravação..."
                    : "Uploading recording..."}
                </span>
                <Progress
                  value={uploadProgress}
                  className="w-full max-w-[240px] bg-white/10 h-2"
                />
                <span className="text-xs text-foreground mt-1.5 font-bold">
                  {uploadProgress}%
                </span>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3.5" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider animate-pulse">
                  {language === "pt" ? "A analisar..." : "Analyzing..."}
                </span>
              </>
            )}
          </motion.div>
        )}

        {/* Error state with recover actions */}
        {recordState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-4 shadow-lg text-left"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-400">
                  {language === "pt" ? "Erro de gravação" : "Recording Error"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              {errorMessage?.includes("permissão") ||
              errorMessage?.includes("permission") ? (
                <Button
                  type="button"
                  onClick={() => {
                    toast.info(
                      language === "pt"
                        ? "Clique no ícone de microfone nas definições do browser."
                        : "Click the microphone icon in browser settings.",
                    );
                  }}
                  className="text-xs h-9 bg-primary hover:bg-emerald-600 text-white"
                >
                  <Settings size={12} className="mr-1.5" />
                  {language === "pt" ? "Abrir Definições" : "Open Settings"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={handleRetry}
                className="text-xs h-9 border-white/10 text-foreground hover:bg-white/5"
              >
                <RefreshCw size={12} className="mr-1.5 animate-spin-reverse" />
                {language === "pt" ? "Tentar novamente" : "Try again"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                {language === "pt" ? "Cancelar" : "Cancel"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Single Audio Recorder view */}
        {(recordState === "idle" ||
          recordState === "recording" ||
          recordState === "requesting" ||
          recordState === "success") && (
          <motion.div
            key="recorder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Primary Action Button */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/15 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)]">
              <div className="absolute inset-x-8 top-10 h-32 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-emerald-300">
                      {language === "pt"
                        ? "Gravação acústica"
                        : "Acoustic recording"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {language === "pt"
                        ? "Toque para gravar. O Pawra precisa de acesso ao microfone."
                        : "Tap to record. Pawra needs microphone access."}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      recordState === "recording"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    <Volume2 className="h-3 w-3" />
                    {recordState === "idle" || recordState === "success"
                      ? language === "pt"
                        ? "Pronto"
                        : "Ready"
                      : recordState === "recording"
                        ? language === "pt"
                          ? "A gravar"
                          : "Recording"
                        : language === "pt"
                          ? "A ligar"
                          : "Connecting"}
                  </Badge>
                </div>

                <LiveWaveformBars
                  active={recordState === "recording" || isLiveAudioStreaming}
                  level={liveAudioLevel}
                  waveform={liveWaveform}
                />

                <div className="min-h-[2.5rem] flex flex-col items-center justify-center">
                  {isAutoMode ? (
                    <p className="text-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse text-center">
                      {t("recordingPage.autoModeOn")}
                    </p>
                  ) : recordState === "recording" ? (
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground text-center">
                        {t("recordingPage.recordingAcustic")}
                      </p>
                      <p className="text-xs font-semibold text-emerald-400 mt-1">
                        Frequência dominante: {dominantFreq}Hz
                      </p>
                    </div>
                  ) : recordState === "requesting" ? (
                    <p className="text-sm text-muted-foreground text-center">
                      {t("recordingPage.requestingMic")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      {t("recordingPage.pressForAuto")}
                    </p>
                  )}
                </div>

                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      "absolute h-48 w-48 rounded-full border transition-all duration-300",
                      recordState === "recording"
                        ? "border-rose-400/30 bg-rose-500/5"
                        : "border-emerald-400/20 bg-emerald-500/5",
                    )}
                    style={{
                      transform: `scale(${1 + Math.min(0.18, liveAudioLevel * 0.18)})`,
                    }}
                  />
                  <GlowingButton
                    data-testid="record-button"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onPointerLeave={handlePointerCancel}
                    disabled={recordState === "requesting"}
                    animate={
                      recordState === "recording" || isAutoMode
                        ? { scale: [1, 1.05, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      recordState === "recording" || isAutoMode
                        ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                    active={recordState === "recording" || isAutoMode}
                    glowColor={
                      recordState === "recording"
                        ? "#ef4444"
                        : isAutoMode
                          ? "#06b6d4"
                          : "#10b981"
                    }
                    className={cn(
                      "w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2",
                      "font-semibold shadow-2xl transition-all duration-300",
                      "active:scale-95 disabled:cursor-not-allowed active-scale tap-highlight-none",
                      buttonColor,
                    )}
                    aria-label="Iniciar gravação"
                  >
                    {renderButtonContent()}
                  </GlowingButton>
                </div>

                <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground">
                    <span>
                      {language === "pt" ? "Nível de áudio" : "Audio level"}
                    </span>
                    <span className="text-emerald-300">
                      {Math.round(liveAudioLevel * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-150"
                      style={{
                        width: `${Math.min(100, Math.round(liveAudioLevel * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center h-4 font-sans">
                  {isAutoMode &&
                    recordState === "idle" &&
                    t("recordingPage.nextAcusticSoon")}
                  {!isAutoMode &&
                    recordState === "idle" &&
                    t("recordingPage.tapForSingle")}
                </p>

                {pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-200"
                  >
                    {pendingCount === 1
                      ? "1 gravação pendente"
                      : `${pendingCount} gravações pendentes`}
                  </Badge>
                )}

                {(recordState === "recording" || isLiveAudioStreaming) && (
                  <P5AudioVisualizer
                    level={liveAudioLevel}
                    waveform={liveWaveform}
                    isActive={isLiveAudioStreaming}
                    emotion={result ? result.state : "neutral"}
                  />
                )}
              </div>
            </div>

            {/* Context Tags Selection (Removed for simpler flow) */}

            {/* Classification Result card */}
            {result && recordState === "success" && (
              <div className="space-y-4 animate-fade-in">
                {isOfflineMode && (
                  <div className="flex justify-center">
                    <Badge
                      variant="destructive"
                      className="text-xs animate-pulse bg-red-950/50 border-red-500/30 text-red-400"
                    >
                      ⚠️{" "}
                      {language === "pt"
                        ? "Modo offline (TF.js local)"
                        : "Offline Mode (Local TF.js)"}
                    </Badge>
                  </div>
                )}
                <ResultCard
                  result={result}
                  activeAnimal={activeAnimal}
                  onFeedback={(feedback) => {
                    if (result.eventId) {
                      feedbackMutation.mutate({
                        eventId: result.eventId,
                        feedback,
                      });
                    }
                  }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continuous Mode Banner */}
      <div
        className={cn(
          "border rounded-2xl p-4 flex items-center justify-between transition-all duration-300",
          isAutoMode
            ? "bg-cyan-950/20 border-cyan-500/20 shadow-md shadow-cyan-950/10"
            : "bg-card border-border",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300",
              isAutoMode
                ? "bg-cyan-500/10 text-cyan-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <InfinityIcon size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("recordingPage.continuousMode")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAutoMode
                ? `${autoClassificationCount} ${t("recordingPage.classificationsCount")}`
                : t("recordingPage.continuousDesc")}
            </p>
            {isAutoMode && lastAutoResult && (
              <p className="text-[11px] text-cyan-300 mt-1 truncate max-w-[220px] flex items-center gap-1.5">
                <span>{t("recordingPage.lastClass")}</span>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: STATE_COLORS[lastAutoResult.state],
                  }}
                />
                <span>
                  {t(`states.${lastAutoResult.state}` as any) ||
                    STATE_LABELS[lastAutoResult.state]}{" "}
                  · {Math.round(lastAutoResult.confidence * 100)}%
                </span>
              </p>
            )}
          </div>
        </div>
        <Button
          variant={isAutoMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "text-xs font-semibold transition-all duration-300 active-scale tap-highlight-none",
            isAutoMode
              ? "bg-cyan-500 hover:bg-cyan-600 text-white border-0 shadow-sm"
              : "hover:bg-cyan-500/5 hover:text-cyan-400 hover:border-cyan-500/30",
          )}
          onClick={isAutoMode ? disableAutoMode : enableAutoMode}
        >
          {isAutoMode ? t("recordingPage.stop") : t("recordingPage.enable")}
        </Button>
      </div>

      {/* Recent history */}
      {recentEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("recordingPage.recentClass")}
            </h2>
          </div>
          {recentEvents.map((event) => (
            <HistoryItem key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Veterinary Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm text-left">
        <span className="text-base select-none mt-0.5">⚠️</span>
        <p className="leading-relaxed">
          <strong>Aviso:</strong> Pawra não substitui avaliação veterinária. Os
          resultados são estimativas comportamentais baseadas em áudio.
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed max-w-[360px] mx-auto pt-4 pb-2">
        {language === "pt"
          ? "Pawra não substitui avaliação veterinária. Os resultados são estimativas comportamentais baseadas em áudio e contexto."
          : "Pawra does not replace veterinary evaluation. Results are behavioral estimates based on audio and context."}
      </p>
    </div>
  );
}
