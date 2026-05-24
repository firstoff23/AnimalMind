import { useCallback, useEffect, useRef, useState } from "react";
import { calculateAudioLevel, createWaveform } from "@/lib/audioLevel";

export type LiveAudioStatus = "idle" | "requesting" | "streaming" | "unsupported" | "denied" | "error";

const EMPTY_WAVEFORM = Array.from({ length: 16 }, () => 0);

type WebkitWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as WebkitWindow).webkitAudioContext ?? null;
}

export function useLiveAudioStream() {
  const [status, setStatus] = useState<LiveAudioStatus>("idle");
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(EMPTY_WAVEFORM);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const resetMeter = useCallback(() => {
    setLevel(0);
    setWaveform(EMPTY_WAVEFORM);
  }, []);

  const cleanupStream = useCallback((resetState = true) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }

    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    if (resetState) {
      resetMeter();
    }
  }, [resetMeter]);

  const stop = useCallback(() => {
    cleanupStream(true);
    setStatus("idle");
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return false;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      setStatus("unsupported");
      return false;
    }

    cleanupStream(true);
    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      const samples = new Uint8Array(analyser.fftSize);
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      analyserRef.current = analyser;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        setLevel(calculateAudioLevel(samples));
        setWaveform(createWaveform(samples, 16));
        animationFrameRef.current = requestAnimationFrame(tick);
      };

      setStatus("streaming");
      tick();
      return true;
    } catch (error) {
      cleanupStream(true);
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error");
      return false;
    }
  }, [cleanupStream]);

  useEffect(() => () => cleanupStream(false), [cleanupStream]);

  return {
    level,
    waveform,
    status,
    isStreaming: status === "streaming",
    start,
    stop,
  };
}
