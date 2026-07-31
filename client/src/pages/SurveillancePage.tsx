import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { VoiceRecorder } from "capacitor-voice-recorder";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { trpc } from "@/lib/trpc";
import { Shield, ShieldAlert, Activity, StopCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SurveillancePage() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Inativo");
  const classifyMutation = trpc.classify.run.useMutation();
  const loopRef = useRef<boolean>(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSurveillance();
    };
  }, []);

  const startSurveillance = async () => {
    if (!Capacitor.isNativePlatform()) {
      alert("O Modo Vigilância apenas funciona em dispositivos móveis Android/iOS.");
      return;
    }

    try {
      const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
      if (!hasPermission.value) {
        const request = await VoiceRecorder.requestAudioRecordingPermission();
        if (!request.value) {
          alert("Permissão de microfone negada.");
          return;
        }
      }

      await KeepAwake.keepAwake();
      if (Capacitor.getPlatform() === 'android') {
        await ForegroundService.startForegroundService({
          id: 1,
          title: 'Pawra',
          body: 'Modo Vigilância ativo (escutando ambiente...)',
          smallIcon: 'ic_stat_name',
        });
      }

      setIsActive(true);
      loopRef.current = true;
      setStatus("A gravar...");
      surveillanceLoop();
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar vigilância.");
    }
  };

  const stopSurveillance = async () => {
    setIsActive(false);
    loopRef.current = false;
    setStatus("Inativo");

    try {
      if (Capacitor.isNativePlatform()) {
        await KeepAwake.allowSleep();
        if (Capacitor.getPlatform() === 'android') {
          await ForegroundService.stopForegroundService();
        }
        const status = await VoiceRecorder.getCurrentStatus();
        if (status.status === 'RECORDING') {
          await VoiceRecorder.stopRecording();
        }
      }
    } catch (e) {
      console.error("Error stopping surveillance", e);
    }
  };

  const surveillanceLoop = async () => {
    while (loopRef.current) {
      try {
        await VoiceRecorder.startRecording();
        setStatus("A gravar...");
        
        // Record for 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        if (!loopRef.current) {
          await VoiceRecorder.stopRecording();
          break;
        }
        
        const result = await VoiceRecorder.stopRecording();
        setStatus("A analisar...");
        
        if (result.value && result.value.recordDataBase64) {
          await classifyMutation.mutateAsync({
            audio: result.value.recordDataBase64,
            audioMimeType: result.value.mimeType,
          });
        }
      } catch (e) {
        console.error("Erro no loop de vigilância:", e);
        setStatus("Erro");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait before retry
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6">
      <div className={`p-8 rounded-full ${isActive ? 'bg-red-100 animate-pulse' : 'bg-slate-100'}`}>
        {isActive ? <ShieldAlert className="w-24 h-24 text-red-600" /> : <Shield className="w-24 h-24 text-slate-400" />}
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Modo Vigilância</h1>
        <p className="text-slate-500 max-w-sm">
          Deixe este dispositivo em casa. A Pawra irá escutar continuamente e alertar o seu telemóvel principal se detetar latidos ou miados anormais.
        </p>
      </div>

      <div className="flex items-center space-x-2 text-sm font-medium">
        <Activity className={`w-4 h-4 ${isActive ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
        <span className={isActive ? 'text-red-600' : 'text-slate-500'}>
          Estado: {status}
        </span>
      </div>

      {Capacitor.getPlatform() === 'android' && (
        <Alert variant="default" className="w-full max-w-sm mb-4 border-yellow-500/50 bg-yellow-500/10">
          <ShieldAlert className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Otimização de Bateria</AlertTitle>
          <AlertDescription className="text-muted-foreground text-xs mt-1">
            Para que a vigilância funcione a noite toda, vá a Definições {'>'} Bateria e defina o uso desta App como "Sem restrições (Unrestricted)".
          </AlertDescription>
        </Alert>
      )}

      <Button 
        size="lg" 
        className={`w-full max-w-xs ${isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900'}`}
        onClick={isActive ? stopSurveillance : startSurveillance}
      >
        {isActive ? (
          <>
            <StopCircle className="w-5 h-5 mr-2" />
            Parar Vigilância
          </>
        ) : (
          <>
            <PlayCircle className="w-5 h-5 mr-2" />
            Iniciar Vigilância
          </>
        )}
      </Button>
    </div>
  );
}
