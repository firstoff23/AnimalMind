import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Activity, Play, Square } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";

export default function MonitorPage() {
  const { user } = useAuth();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const classifyMutation = trpc.classify.run.useMutation();

  const addLog = (msg: string) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 10));
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  const processAudioChunk = async (audioBlob: Blob) => {
    try {
      addLog(`A analisar amostra de áudio... (${Math.round(audioBlob.size / 1024)} KB)`);
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];
        
        try {
          const result = await classifyMutation.mutateAsync({
            audio: base64data,
            audioMimeType: "audio/webm",
          });
          
          if (result.state === "distress" || result.state === "alert") {
            addLog(`ALERTA: Detectado ${result.state} com ${Math.round(result.confidence * 100)}% de confiança.`);
            toast.warning(`PeloNaRoupa detetou ${result.state}!`);
          } else {
            addLog(`Estado normal (${result.state}, ${Math.round(result.confidence * 100)}%)`);
          }
        } catch (err) {
          addLog("Erro na análise (timeout ou servidor ocupado).");
        }
      };
    } catch (err) {
      console.error(err);
      addLog("Erro ao processar o áudio.");
    }
  };

  const startMonitoring = async () => {
    try {
      // 1. Manter ecrã ligado
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.keepAwake();
        
        // 2. Iniciar Foreground Service para Android
        if (Capacitor.getPlatform() === "android") {
          await ForegroundService.startForegroundService({
            id: 1,
            title: "PeloNaRoupa - Monitorização Ativa",
            body: "A escutar continuamente o ambiente...",
            smallIcon: "ic_stat_icon",
          });
        }
      }

      // 3. Obter Microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      setIsMonitoring(true);
      addLog("Monitorização contínua ativada.");

      const startChunk = () => {
        if (!isMonitoring) return;
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            processAudioChunk(audioBlob);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();

        // Parar ao fim de 5 segundos
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, 5000);
      };

      startChunk();
      monitorIntervalRef.current = setInterval(startChunk, 6000);

    } catch (err) {
      console.error(err);
      addLog("Erro ao iniciar a monitorização.");
      toast.error("Permissão de microfone negada ou erro ao iniciar.");
      stopMonitoring();
    }
  };

  const stopMonitoring = async () => {
    setIsMonitoring(false);
    
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (Capacitor.isNativePlatform()) {
      await KeepAwake.allowSleep();
      
      if (Capacitor.getPlatform() === "android") {
        await ForegroundService.stopForegroundService();
      }
    }
    addLog("Monitorização desativada.");
  };

  if (!user) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="container max-w-2xl py-6 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Modo Monitor</h1>
        <p className="text-muted-foreground">
          Deixe este dispositivo em casa (como um telemóvel antigo ou tablet) para escutar o seu animal continuamente.
        </p>
      </div>

      <Card className="border-2 shadow-md relative overflow-hidden">
        <CardHeader className="text-center space-y-1 relative z-10">
          <CardTitle className="text-2xl">Escuta Passiva</CardTitle>
          <CardDescription>
            {isMonitoring
              ? "A escutar ambiente e enviar alertas..."
              : "Pronto para iniciar monitorização."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pt-6 space-y-8 relative z-10">
          <div className="relative flex items-center justify-center w-48 h-48">
            {isMonitoring && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            )}
            <div className="absolute inset-8 bg-card rounded-full flex items-center justify-center z-10 shadow-lg border-2 border-primary/20">
              <Activity className={`w-16 h-16 ${isMonitoring ? "text-primary" : "text-muted-foreground"}`} />
            </div>
          </div>

          {!isMonitoring ? (
            <Button size="lg" className="w-full max-w-xs gap-2" onClick={startMonitoring}>
              <Play className="w-5 h-5" /> Iniciar Monitorização
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="w-full max-w-xs gap-2" onClick={stopMonitoring}>
              <Square className="w-5 h-5" /> Parar
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem registos ainda.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-4 text-sm border-b pb-2 last:border-0">
                  <span className="text-muted-foreground whitespace-nowrap">{log.time}</span>
                  <span className={log.msg.includes("ALERTA") ? "text-destructive font-medium" : ""}>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
