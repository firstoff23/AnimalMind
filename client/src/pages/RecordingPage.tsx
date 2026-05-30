import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { GlowingButton } from "@/components/ui/GlowingButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { P5AudioVisualizer } from "@/components/P5AudioVisualizer";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Mic, MicOff, ThumbsUp, ThumbsDown, Clock, Infinity as InfinityIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLiveAudioStream } from "@/hooks/useLiveAudioStream";
import callBackend from "@/lib/apiClient";
import { useNotifications } from "@/hooks/useNotifications";
import { STATE_LABELS, STATE_COLORS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";
import { useLanguage } from "@/hooks/useLanguage";

type RecordingState = "idle" | "requesting" | "recording" | "processing";
type CameraState = "idle" | "loading" | "allowed" | "denied" | "not_found" | "error";

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
  const { t } = useLanguage();
  const [feedbackSent, setFeedbackSent] = useState<"correct" | "incorrect" | null>(null);
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
      setNotes((prev) => (prev ? prev + " " + transcript : transcript));
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
          {t("recordingPage.correct")}
        </Button>
        <Button
          variant={feedbackSent === "incorrect" ? "destructive" : "outline"}
          size="sm"
          className="flex-1 gap-2"
          onClick={() => handleFeedback("incorrect")}
          disabled={feedbackSent !== null}
        >
          <ThumbsDown size={16} />
          {t("recordingPage.incorrect")}
        </Button>
      </div>

      {/* Notes / Dictation section */}
      <div className="space-y-2 pt-3 border-t border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          {t("recordingPage.observationNote")}
        </label>
        <div className="flex gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("recordingPage.observationPlaceholder")}
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
            title={t("recordingPage.dictateNote")}
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
            {updateNotesMutation.isPending ? t("recordingPage.saving") : t("recordingPage.saveNote")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ event }: { event: { state: string; confidence: number; emoji: string; modelUsed: string; createdAt: Date } }) {
  const { t } = useLanguage();
  const state = event.state as EmotionalState;
  const pct = Math.round(event.confidence * 100);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-2xl">{event.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: STATE_COLORS[state] }}>
          {t(`states.${state}` as any) || STATE_LABELS[state]}
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

function determinePostureFromLandmarks(landmarks: any[]): string | null {
  if (!landmarks || landmarks.length < 25) return null;
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipX = (leftHip.x + rightHip.x) / 2;

  const dy = Math.abs(hipY - shoulderY);
  
  if (dy < 0.12) {
    return "lying";
  }

  if (leftAnkle && rightAnkle) {
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
    const hipToAnkle = Math.abs(ankleY - hipY);
    if (hipToAnkle < 0.15) {
      return "sitting";
    }
  }

  if (dy > 0.28) {
    return "standing";
  }

  return "sitting";
}

// ─── Recording Page ───────────────────────────────────────────────────────────

import { useAppStore } from "@/store/appStore";

export default function RecordingPage() {
  const { t, language } = useLanguage();
  const { cameraActive, setCamera, setRecording } = useAppStore();
  const [cameraState, setCameraState] = useState<CameraState>(cameraActive ? "loading" : "idle");
  const showCamera = cameraState === "allowed";
  const setShowCamera = setCamera;

  const [recordState, setRecordState] = useState<RecordingState>("idle");

  useEffect(() => {
    setRecording(recordState === "recording");
  }, [recordState, setRecording]);

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
    stream: liveAudioStream,
  } = useLiveAudioStream();

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoClassificationCount, setAutoClassificationCount] = useState(0);
  const [lastAutoResult, setLastAutoResult] = useState<ClassifyResult | null>(null);

  const isAutoModeRef = useRef(false);
  const autoRecordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef(false);

  // Vision state hooks
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [detectedPosture, setDetectedPosture] = useState<string>("sitting");
  const [detectedSpecies, setDetectedSpecies] = useState<{ species: string; confidence: number } | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMediaPipeActive, setIsMediaPipeActive] = useState(false);
  const [mediaPipeLandmarks, setMediaPipeLandmarks] = useState<any>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const lastRecordedBlobRef = useRef<Blob | null>(null);
  const [dominantFreq, setDominantFreq] = useState<number>(0);
  const [spectralEnergy, setSpectralEnergy] = useState<number>(0);
  const [tonalBrightness, setTonalBrightness] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const utils = trpc.useUtils();
  const { data: activeAnimalData } = trpc.animals.getActive.useQuery();
  const { data: recentEventsData = [] } = trpc.events.recent.useQuery({ limit: 5 });
  const { data: settingsData } = trpc.settings.get.useQuery();
  const activeAnimal = activeAnimalData as ActiveAnimal | null | undefined;
  const recentEvents = recentEventsData as RecentEvent[];

  const handleToggleCamera = async () => {
    if (cameraState === "allowed" || cameraState === "loading") {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraState("idle");
      setShowCamera(false);
    } else {
      setCameraState("loading");
      setShowCamera(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMessage = language === "pt"
          ? "O seu browser ou dispositivo não suporta acesso direto à câmara (ou não é um contexto seguro HTTPS)."
          : "Your browser or device does not support direct camera access (or it is not a secure HTTPS context).";
        setCameraError(errorMessage);
        setCameraState("error");
        toast.error(errorMessage);
        return;
      }

      try {
        let stream: MediaStream;
        try {
          // Attempt with ideal constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: { ideal: facingMode },
            },
          });
        } catch (constraintErr) {
          console.warn("Camera getUserMedia failed with ideal constraints, trying fallback...", constraintErr);
          // Fallback to basic video request
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
        
        streamRef.current = stream;
        setCameraPermissionDenied(false);
        setCameraError(null);
        setCameraState("allowed");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.error("Play error:", err));
        }
      } catch (err) {
        console.error("Camera access error:", err);
        let errorMessage = language === "pt" ? "Não foi possível aceder à câmara." : "Could not access camera.";
        let isDenied = false;
        let nextState: CameraState = "error";
        
        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
            case "PermissionDeniedError":
              errorMessage = language === "pt" ? "Permissão de câmara negada. Ative nas definições do browser." : "Camera permission denied. Enable in browser settings.";
              isDenied = true;
              nextState = "denied";
              break;
            case "NotFoundError":
            case "DevicesNotFoundError":
              errorMessage = language === "pt" ? "Nenhuma câmara disponível no dispositivo." : "No camera available on this device.";
              nextState = "not_found";
              break;
            default:
              nextState = "error";
              break;
          }
        }
        
        setCameraPermissionDenied(isDenied);
        setCameraError(errorMessage);
        setCameraState(nextState);
        toast.error(errorMessage);
        setShowCamera(false);
      }
    }
  };

  const handleSwitchCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraState("loading");

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: { ideal: newMode },
          },
        });
      } catch (constraintErr) {
        console.warn("Switch camera failed with constraints, trying fallback...", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      setCameraPermissionDenied(false);
      setCameraError(null);
      setCameraState("allowed");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.error("Play error during switch:", err));
      }
    } catch (err) {
      console.error("Camera access error during switch:", err);
      let errorMessage = language === "pt" ? "Não foi possível aceder à câmara." : "Could not access camera.";
      let isDenied = false;
      let nextState: CameraState = "error";

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
          case "PermissionDeniedError":
            errorMessage = language === "pt" ? "Permissão de câmara negada. Ative nas definições do browser." : "Camera permission denied. Enable in browser settings.";
            isDenied = true;
            nextState = "denied";
            break;
          case "NotFoundError":
          case "DevicesNotFoundError":
            errorMessage = language === "pt" ? "Nenhuma câmara disponível no dispositivo." : "No camera available on this device.";
            nextState = "not_found";
            break;
          default:
            nextState = "error";
            break;
        }
      }

      setCameraPermissionDenied(isDenied);
      setCameraError(errorMessage);
      setCameraState(nextState);
      toast.error(errorMessage);
      setShowCamera(false);
    }
  };

  const videoRefCallback = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch((err) => console.error("Play error in callback ref:", err));
    }
  };

  // Auto-init camera if cameraActive from store is true
  useEffect(() => {
    if (cameraActive) {
      void (async () => {
        setCameraState("loading");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const errorMessage = language === "pt"
            ? "O seu browser ou dispositivo não suporta acesso direto à câmara (ou não é um contexto seguro HTTPS)."
            : "Your browser or device does not support direct camera access (or it is not a secure HTTPS context).";
          setCameraError(errorMessage);
          setCameraState("error");
          return;
        }

        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: { ideal: facingMode },
              },
            });
          } catch (constraintErr) {
            console.warn("Camera getUserMedia failed with ideal constraints, trying fallback...", constraintErr);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          }
          
          streamRef.current = stream;
          setCameraPermissionDenied(false);
          setCameraError(null);
          setCameraState("allowed");

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((err) => console.error("Play error:", err));
          }
        } catch (err) {
          console.error("Camera access error on auto-init:", err);
          let errorMessage = language === "pt" ? "Não foi possível aceder à câmara." : "Could not access camera.";
          let isDenied = false;
          let nextState: CameraState = "error";
          
          if (err instanceof DOMException) {
            switch (err.name) {
              case "NotAllowedError":
              case "PermissionDeniedError":
                errorMessage = language === "pt" ? "Permissão de câmara negada. Ative nas definições do browser." : "Camera permission denied. Enable in browser settings.";
                isDenied = true;
                nextState = "denied";
                break;
              case "NotFoundError":
              case "DevicesNotFoundError":
                errorMessage = language === "pt" ? "Nenhuma câmara disponível no dispositivo." : "No camera available on this device.";
                nextState = "not_found";
                break;
              default:
                nextState = "error";
                break;
            }
          }
          
          setCameraPermissionDenied(isDenied);
          setCameraError(errorMessage);
          setCameraState(nextState);
          setShowCamera(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // YOLOv8 simulated or MediaPipe skeleton canvas loop
  useEffect(() => {
    if (!showCamera) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isMediaPipeActive && mediaPipeLandmarks) {
        // DRAW MEDIAPIPE OVERLAY
        const getPt = (idx: number) => {
          const lm = mediaPipeLandmarks[idx];
          if (!lm) return null;
          return { x: lm.x * canvas.width, y: lm.y * canvas.height };
        };

        const nose = getPt(0);
        const leftEye = getPt(2);
        const rightEye = getPt(5);
        const leftEar = getPt(7);
        const rightEar = getPt(8);
        const leftShoulder = getPt(11);
        const rightShoulder = getPt(12);
        const leftElbow = getPt(13);
        const rightElbow = getPt(14);
        const leftWrist = getPt(15);
        const rightWrist = getPt(16);
        const leftHip = getPt(23);
        const rightHip = getPt(24);
        const leftAnkle = getPt(27);
        const rightAnkle = getPt(28);

        const neck = (leftShoulder && rightShoulder) ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 } : null;
        const hip = (leftHip && rightHip) ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 } : null;

        ctx.strokeStyle = "rgba(34, 197, 94, 0.85)"; // emerald
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const drawLine = (p1?: { x: number, y: number } | null, p2?: { x: number, y: number } | null) => {
          if (!p1 || !p2) return;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        };

        // Head connections
        drawLine(leftEar, leftEye);
        drawLine(leftEye, nose);
        drawLine(nose, rightEye);
        drawLine(rightEye, rightEar);
        if (neck) drawLine(nose, neck);

        // Spine and legs
        drawLine(neck, leftElbow);
        drawLine(leftElbow, leftWrist);
        drawLine(neck, rightElbow);
        drawLine(rightElbow, rightWrist);
        drawLine(neck, hip);
        drawLine(hip, leftAnkle);
        drawLine(hip, rightAnkle);

        // Draw simulated tail
        if (hip) {
          const tailTip = { x: hip.x - 30, y: hip.y - 15 + Math.sin(Date.now() * 0.005) * 8 };
          drawLine(hip, tailTip);
        }

        // Draw joints (Keypoints)
        const joints = [
          { pt: nose, name: "nose" },
          { pt: leftEye, name: "joint" },
          { pt: rightEye, name: "joint" },
          { pt: leftEar, name: "joint" },
          { pt: rightEar, name: "joint" },
          { pt: leftShoulder, name: "joint" },
          { pt: rightShoulder, name: "joint" },
          { pt: leftElbow, name: "joint" },
          { pt: rightElbow, name: "joint" },
          { pt: leftWrist, name: "joint" },
          { pt: rightWrist, name: "joint" },
          { pt: leftHip, name: "joint" },
          { pt: rightHip, name: "joint" },
          { pt: leftAnkle, name: "joint" },
          { pt: rightAnkle, name: "joint" }
        ];

        joints.forEach(({ pt, name }) => {
          if (!pt) return;
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

        // Bounding Box
        const validPts = [nose, leftEye, rightEye, leftEar, rightEar, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip, leftAnkle, rightAnkle].filter(p => p !== null) as { x: number, y: number }[];
        if (validPts.length > 0) {
          const xs = validPts.map(p => p.x);
          const ys = validPts.map(p => p.y);
          const minX = Math.min(...xs) - 15;
          const maxX = Math.max(...xs) + 15;
          const minY = Math.min(...ys) - 15;
          const maxY = Math.max(...ys) + 15;

          ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
          ctx.setLineDash([]);
        }

        // Label
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`MediaPipe Local: ${detectedPosture.toUpperCase()}`, 10, 20);

      } else {
        // DRAW SIMULATED SKELETON
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
        ctx.fillText(`Server Fallback: ${detectedPosture.toUpperCase()}`, minX + 5, minY - 5);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [showCamera, detectedPosture, isMediaPipeActive, mediaPipeLandmarks]);

  // MediaPipe Pose browser detection loop
  useEffect(() => {
    if (!showCamera) {
      setIsMediaPipeActive(false);
      setMediaPipeLandmarks(null);
      return;
    }
    let active = true;
    let pose: any;

    const initPose = async () => {
      try {
        const mpPose = await import("@mediapipe/pose");
        pose = new mpPose.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults((results: any) => {
          if (!active) return;
          if (results.poseLandmarks) {
            setIsMediaPipeActive(true);
            setMediaPipeLandmarks(results.poseLandmarks);
            
            const posture = determinePostureFromLandmarks(results.poseLandmarks);
            if (posture) {
              setDetectedPosture(posture);
            }
          } else {
            setMediaPipeLandmarks(null);
          }
        });

        const video = videoRef.current;
        if (video) {
          const processFrame = async () => {
            if (!active) return;
            if (video.readyState >= 2) {
              try {
                await pose.send({ image: video });
              } catch (err) {
                console.warn("MediaPipe Pose frame process error:", err);
              }
            }
            if (active) {
              requestAnimationFrame(processFrame);
            }
          };
          requestAnimationFrame(processFrame);
        }
      } catch (err) {
        console.error("Failed to load/init MediaPipe Pose:", err);
        if (active) {
          setIsMediaPipeActive(false);
        }
      }
    };

    initPose();
    return () => {
      active = false;
      if (pose) {
        try {
          pose.close();
        } catch (e) {}
      }
    };
  }, [showCamera]);

  // Periodic frame upload loop for YOLOv8 posture detection
  useEffect(() => {
    if (!showCamera) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const captureFrameAndDetect = async () => {
      if (isMediaPipeActive) {
        if (active) {
          timeoutId = setTimeout(captureFrameAndDetect, 2000);
        }
        return;
      }
      const video = videoRef.current;
      if (!video || video.paused || video.ended) {
        // Retry in 1 second if video is not ready yet
        if (active) {
          timeoutId = setTimeout(captureFrameAndDetect, 1000);
        }
        return;
      }

      try {
        // Create an offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            if (!blob || !active) return;

            try {
              const file = new File([blob], "frame.jpg", { type: "image/jpeg" });

              // Posture detection — primary (Fly.dev) → fallback (HF Space)
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await callBackend("/detect-posture", { method: "POST", body: formData });
                if (active) {
                  const data = await res.json() as { posture: string; confidence: number };
                  if (data?.posture) setDetectedPosture(data.posture);
                }
              } catch {
                // Both backends failed — keep last known posture
              }

              // Species detection (best-effort) — only when no animal selected
              if (!activeAnimal) {
                try {
                  const speciesForm = new FormData();
                  speciesForm.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }));
                  const speciesRes = await callBackend("/detect-species", { method: "POST", body: speciesForm });
                  if (active) {
                    const speciesData = await speciesRes.json() as { species: string; confidence: number };
                    if (speciesData?.species && speciesData.species !== "unknown") {
                      setDetectedSpecies(speciesData);
                    }
                  }
                } catch {
                  // Species detection is best-effort; ignore errors
                }
              }
            } catch (err) {
              console.error("Error calling detect-posture API:", err);
            }
          }, "image/jpeg", 0.7);
        }
      } catch (err) {
        console.error("Frame capture error:", err);
      }

      if (active) {
        timeoutId = setTimeout(captureFrameAndDetect, 2000);
      }
    };

    // Start loop
    timeoutId = setTimeout(captureFrameAndDetect, 2000);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showCamera, facingMode]);

  const startRecordingCycle = async () => {
    setRecordState("requesting");
    await requestNotificationPermission();
    const started = await startLiveAudio();
    if (!started) {
      setRecordState("idle");
      setIsAutoMode(false);
      isAutoModeRef.current = false;
      toast.error(language === "pt" ? "Não foi possível aceder ao microfone. Modo Automático desativado." : "Could not access microphone. Continuous Mode disabled.");
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
    toast.info(language === "pt" ? "Modo Automático desligado." : "Continuous Mode turned off.");
  };

  const enableAutoMode = () => {
    setIsAutoMode(true);
    isAutoModeRef.current = true;
    setAutoClassificationCount(0);
    setLastAutoResult(null);
    setResult(null);
    clearAutoRecordingTimer();
    startRecordingCycle();
    toast.success(language === "pt" ? "Modo Automático ativado!" : "Continuous Mode active!");
  };

  const classifyMutation = trpc.classify.run.useMutation({
    onSuccess: (data) => {
      setIsOfflineMode(false);
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
    onError: async () => {
      stopLiveAudio();

      const lastBlob = lastRecordedBlobRef.current;
      if (lastBlob) {
        try {
          toast.info(language === "pt" ? "Servidor indisponível. A classificar offline com TF.js..." : "Server unavailable. Classifying offline with TF.js...");

          const localClassifier = await import("@/lib/localClassifier");
          const localRes = await localClassifier.runLocalYAMNet(lastBlob);

          const res: ClassifyResult = {
            state: localRes.state as EmotionalState,
            confidence: localRes.confidence,
            emoji: localRes.emoji,
            model_used: "yamnet-local" as any,
            cached: false,
            eventId: undefined,
            posture: showCamera ? detectedPosture : undefined,
          };

          setResult(res);
          setIsOfflineMode(true);

          sendClassificationNotification(
            res.state,
            res.confidence,
            activeAnimal?.name,
            undefined
          );

          if (isAutoModeRef.current) {
            setAutoClassificationCount((count) => count + 1);
            setLastAutoResult(res);
            setRecordState("idle");
            scheduleAutoRecording(1500);
          } else {
            setRecordState("idle");
          }
          return;
        } catch (localErr) {
          console.error("Local TFJS classification failed:", localErr);
        }
      }

      if (isAutoModeRef.current) {
        setRecordState("idle");
        toast.error(language === "pt" ? "Erro na classificação automática. A tentar novamente em 2 segundos..." : "Error in continuous classification. Retrying in 2 seconds...");
        scheduleAutoRecording(2000);
      } else {
        setRecordState("idle");
        toast.error(language === "pt" ? "Erro ao classificar o áudio. Tente novamente." : "Error classifying audio. Try again.");
      }
    },
  });

  const feedbackMutation = trpc.events.feedback.useMutation({
    onSuccess: () => toast.success(language === "pt" ? "Obrigado pelo feedback!" : "Thank you for your feedback!"),
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
              const amp = Math.pow(10, db / 20);
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
            const brightness = sumAmp > 0 ? Math.round(weightedSum / sumAmp) : 0;

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
        } catch (e) {}
      }
      if (analyser) {
        try {
          analyser.dispose();
        } catch (e) {}
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
          setRecordState("processing");
          
          void (async () => {
            let audioBase64: string | undefined = undefined;
            let audioMimeType: string | undefined = undefined;
            
            try {
              const res = await stopAndGetBlobLiveAudio();
              if (res) {
                lastRecordedBlobRef.current = res.blob;
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
              pitch: dominantFreq,
              spectralEnergy,
              tonalBrightness,
            });
          })();
          
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAnimal?.id, recordState, stopAndGetBlobLiveAudio, classifyMutation.mutate, showCamera, detectedPosture]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
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
          <span className="text-xs">{t("recordingPage.connecting")}</span>
        </>
      );
    }
    if (recordState === "processing") {
      return (
        <>
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">{t("recordingPage.processing")}</span>
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
          <InfinityIcon size={40} strokeWidth={1.5} className="animate-pulse text-cyan-200" />
          <span className="text-sm font-semibold tracking-wider">AUTO</span>
        </>
      );
    }
    return (
      <>
        <Mic size={40} strokeWidth={1.5} />
        <span className="text-sm font-semibold tracking-wider">{t("recordingPage.record")}</span>
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
        ) : detectedSpecies ? (
          <p className="text-sm text-emerald-400 font-medium">
            {language === "pt" ? "IA detetou" : "AI detected"}:{" "}
            {detectedSpecies.species === "dog" ? "🐕 " + (language === "pt" ? "Cão" : "Dog") : "🐈 " + (language === "pt" ? "Gato" : "Cat")}{" "}
            <span className="text-xs text-emerald-500/70">({Math.round(detectedSpecies.confidence * 100)}%)</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("header.noAnimal")}</p>
        )}
      </div>

      {/* Veterinary Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm">
        <span className="text-base select-none mt-0.5">⚠️</span>
        <p className="leading-relaxed text-left">
          <strong>Aviso:</strong> AnimalMind não substitui avaliação veterinária. Os resultados são estimativas comportamentais baseadas em áudio.
        </p>
      </div>

      {/* Módulo de Visão Computacional */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">📷</span>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("recordingPage.cameraTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("recordingPage.cameraDesc")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {cameraState === "allowed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchCamera}
                className="text-xs font-semibold"
              >
                {facingMode === "environment" ? t("recordingPage.cameraFront") : t("recordingPage.cameraBack")}
              </Button>
            )}
            <Button
              variant={cameraState !== "idle" ? "destructive" : "outline"}
              size="sm"
              onClick={handleToggleCamera}
              className="text-xs font-semibold"
            >
              {cameraState !== "idle" ? t("recordingPage.disable") : t("recordingPage.enable")}
            </Button>
          </div>
        </div>

        {cameraState !== "idle" && (
          <div className="space-y-3 pt-2 border-t border-border/50 page-enter">
            <div className="relative w-full max-w-[320px] mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-black border border-border">
              <video
                ref={videoRefCallback}
                muted
                playsInline
                className={cn(
                  "w-full h-full object-cover",
                  facingMode === "user" && "scale-x-[-1]",
                  cameraState !== "allowed" && "hidden"
                )}
              />
              {cameraState === "allowed" && (
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className={cn("absolute inset-0 w-full h-full pointer-events-none", facingMode === "user" && "scale-x-[-1]")}
                />
              )}
              
              {/* State Machine Overlays */}
              {cameraState === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4 text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs font-semibold">{language === "pt" ? "A iniciar câmara..." : "Starting camera..."}</p>
                </div>
              )}
              
              {cameraState === "denied" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white p-4 text-center">
                  <span className="text-3xl mb-2">🔒</span>
                  <p className="text-xs font-bold text-red-400 mb-1">{language === "pt" ? "Acesso Negado" : "Access Denied"}</p>
                  <p className="text-[10px] text-muted-foreground max-w-[260px]">
                    {language === "pt"
                      ? "Por favor, ative a permissão da câmara nas definições do seu browser e recarregue a página."
                      : "Please enable camera permissions in your browser settings and reload the page."}
                  </p>
                </div>
              )}
              
              {cameraState === "not_found" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white p-4 text-center">
                  <span className="text-3xl mb-2">🚫</span>
                  <p className="text-xs font-bold text-yellow-400 mb-1">{language === "pt" ? "Câmara Não Encontrada" : "Camera Not Found"}</p>
                  <p className="text-[10px] text-muted-foreground max-w-[260px]">
                    {language === "pt"
                      ? "Não foi detetada nenhuma câmara neste dispositivo."
                      : "No camera was detected on this device."}
                  </p>
                </div>
              )}
              
              {cameraState === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white p-4 text-center">
                  <span className="text-3xl mb-2">⚠️</span>
                  <p className="text-xs font-bold text-red-500 mb-1">{language === "pt" ? "Erro na Câmara" : "Camera Error"}</p>
                  <p className="text-[10px] text-muted-foreground max-w-[260px] line-clamp-3">
                    {cameraError || (language === "pt" ? "Erro desconhecido." : "Unknown error.")}
                  </p>
                </div>
              )}
            </div>
            
            {cameraState === "allowed" && (
              <div className="flex items-center justify-between gap-3 bg-secondary/30 p-2.5 rounded-xl border border-border/40">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("recordingPage.simulatedPosture")}
                </span>
                <select
                  value={detectedPosture}
                  onChange={(e) => setDetectedPosture(e.target.value)}
                  className="bg-card text-xs font-semibold text-foreground border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="sitting">{t("recordingPage.postureSitting")}</option>
                  <option value="lying">{t("recordingPage.postureLying")}</option>
                  <option value="standing">{t("recordingPage.postureStanding")}</option>
                  <option value="alert">{t("recordingPage.postureAlert")}</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recording button */}
      <div className="flex flex-col items-center gap-4">
        {/* Instruction text above button */}
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
          ) : recordState === "processing" ? (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              {t("recordingPage.processingAcustic")}
            </p>
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

        <GlowingButton
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          disabled={recordState === "requesting" || recordState === "processing"}
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
          glowColor={recordState === "recording" ? "#ef4444" : isAutoMode ? "#06b6d4" : "#10b981"}
          className={cn(
            "w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2",
            "font-semibold shadow-2xl transition-all duration-300",
            "active:scale-95 disabled:cursor-not-allowed",
            buttonColor
          )}
          aria-label="Iniciar gravação"
        >
          {renderButtonContent()}
        </GlowingButton>

        <p className="text-xs text-muted-foreground text-center h-4">
          {isAutoMode && recordState === "idle" && t("recordingPage.nextAcusticSoon")}
          {!isAutoMode && recordState === "idle" && t("recordingPage.tapForSingle")}
        </p>

        {(recordState === "recording" || isLiveAudioStreaming) && (
          <P5AudioVisualizer
            level={liveAudioLevel}
            waveform={liveWaveform}
            isActive={isLiveAudioStreaming}
            emotion={result ? result.state : "neutral"}
          />
        )}
      </div>

      {/* Result card */}
      {result && (
        <div className="space-y-4">
          {result.posture && (
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
                {t("recordingPage.postureEstimated")} {result.posture.toUpperCase()}
              </Badge>
            </div>
          )}
          {isOfflineMode && (
            <div className="flex justify-center">
              <Badge variant="destructive" className="text-xs animate-pulse bg-red-950/50 border-red-500/30 text-red-400">
                ⚠️ {language === "pt" ? "Modo offline (TF.js local)" : "Offline Mode (Local TF.js)"}
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
            <InfinityIcon size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("recordingPage.continuousMode")}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAutoMode
                ? `${autoClassificationCount} ${t("recordingPage.classificationsCount")}`
                : t("recordingPage.continuousDesc")}
            </p>
            {isAutoMode && lastAutoResult && (
              <p className="text-[11px] text-cyan-300 mt-1 truncate max-w-[220px]">
                {t("recordingPage.lastClass")} {lastAutoResult.emoji}{" "}
                {t(`states.${lastAutoResult.state}` as any) || STATE_LABELS[lastAutoResult.state]} ·{" "}
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

      {/* Camera Permission Error Modal */}
      <AlertDialog open={cameraPermissionDenied} onOpenChange={setCameraPermissionDenied}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <AlertDialogTitle>{t("recordingPage.cameraDeniedTitle")}</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t("recordingPage.cameraDeniedDesc")}
            </p>
            <p className="font-semibold text-foreground">
              {language === "pt" ? "Para ativar a câmara:" : "To enable the camera:"}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {language === "pt" ? (
                <>
                  <li>Abra as definições do browser</li>
                  <li>Procure por "Permissões" ou "Privacidade"</li>
                  <li>Encontre "Câmara" e ative para este site</li>
                  <li>Recarregue a página</li>
                </>
              ) : (
                <>
                  <li>Open browser settings</li>
                  <li>Search for "Permissions" or "Privacy"</li>
                  <li>Find "Camera" and enable for this site</li>
                  <li>Reload the page</li>
                </>
              )}
            </ol>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setCameraPermissionDenied(false)}>
              {language === "pt" ? "Entendi" : "Got it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
