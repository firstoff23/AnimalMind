import React, { useState, useRef } from "react";
import { P5AudioVisualizer } from "./P5AudioVisualizer";

export interface AudioClassificationResult {
  vocalization_class: string;
  confidence: number;
  top3: Array<{ vocalization: string; confidence: number }>;
  calibrated: boolean;
  processing_time_ms: number;
}

export interface AudioRecorderCardProps {
  onAudioSubmit?: (audioBlob: Blob) => Promise<void>;
  result?: AudioClassificationResult;
  isProcessing?: boolean;
}

export const AudioRecorderCard: React.FC<AudioRecorderCardProps> = ({
  onAudioSubmit,
  result,
  isProcessing = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveform, setWaveform] = useState<number[]>(Array(16).fill(0.1));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Simulate live waveform motion
      const interval = setInterval(() => {
        if (mediaRecorder.state === "recording") {
          setWaveform(Array.from({ length: 16 }, () => Math.random() * 0.8 + 0.1));
        } else {
          clearInterval(interval);
        }
      }, 100);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Não foi possível aceder ao microfone. Verifica as permissões do navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setWaveform(Array(16).fill(0.05));
    }
  };

  const handleSend = async () => {
    if (audioBlob && onAudioSubmit) {
      await onAudioSubmit(audioBlob);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
            🎙️ Áudio • Vocalização Pet
          </span>
          <h3 className="text-xl font-bold text-white">Gravador de Latidos & Miados</h3>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
            isRecording ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" : "bg-slate-800 text-slate-400 border-slate-700"
          }`}>
            {isRecording ? "🔴 A Gravar..." : "Pronto"}
          </span>
        </div>
      </div>

      {/* Live Waveform Canvas */}
      <P5AudioVisualizer
        emotion={result?.vocalization_class || (isRecording ? "happy" : "neutral")}
        waveform={waveform}
        isActive={isRecording}
        level={isRecording ? 0.8 : 0.1}
      />

      {/* Recording Controls */}
      <div className="flex gap-3 pt-1">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg min-h-[44px]"
          >
            🎤 Iniciar Gravação
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg min-h-[44px]"
          >
            ⏹️ Parar Gravação
          </button>
        )}

        {audioUrl && !isRecording && (
          <button
            onClick={handleSend}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 min-h-[44px]"
          >
            {isProcessing ? "A Analisar..." : "⚡ Classificar Vocalização"}
          </button>
        )}
      </div>

      {/* Audio Playback Preview */}
      {audioUrl && (
        <div className="pt-2">
          <audio src={audioUrl} controls className="w-full h-8 rounded-lg" />
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Vocalização Identificada:</span>
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              {result.vocalization_class} ({(result.confidence * 100).toFixed(1)}%)
            </span>
          </div>

          {result.top3 && result.top3.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400">Top 3 Diagnósticos Fónicos:</p>
              {result.top3.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 capitalize">{item.vocalization}</span>
                    <span className="text-slate-400">{(item.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.confidence * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
