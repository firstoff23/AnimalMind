import React, { useEffect, useState, useRef } from "react";
import { Howl } from "howler";
import { Play, Square, Pause } from "lucide-react";

interface HowlerAudioPlayerProps {
  audioUrl: string;
}

export function HowlerAudioPlayer({ audioUrl }: HowlerAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [audioUrl]);

  const updateProgress = () => {
    if (!soundRef.current || !soundRef.current.playing()) return;
    const seek = soundRef.current.seek() as number;
    const duration = soundRef.current.duration() || 1;
    setProgress((seek / duration) * 100);
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handlePlay = () => {
    if (isPlaying) {
      soundRef.current?.pause();
      setIsPlaying(false);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    if (!soundRef.current) {
      soundRef.current = new Howl({
        src: [audioUrl],
        html5: true, // Required for CORS/blobs
        onplay: () => {
          setIsPlaying(true);
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        },
        onpause: () => {
          setIsPlaying(false);
        },
        onstop: () => {
          setIsPlaying(false);
          setProgress(0);
        },
        onend: () => {
          setIsPlaying(false);
          setProgress(100);
          setTimeout(() => setProgress(0), 300);
        },
        onloaderror: (id, err) => {
          console.error("Howl load error:", err);
          setIsPlaying(false);
        },
        onplayerror: (id, err) => {
          console.error("Howl play error:", err);
          soundRef.current?.unload();
          soundRef.current = null;
          setIsPlaying(false);
        }
      });
    }

    soundRef.current.play();
  };

  const handleStop = () => {
    if (soundRef.current) {
      soundRef.current.stop();
    }
    setIsPlaying(false);
    setProgress(0);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <button
        type="button"
        onClick={handlePlay}
        className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-colors shadow-sm"
        title={isPlaying ? "Pausar" : "Reproduzir"}
      >
        {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" className="ml-0.5" />}
      </button>

      <button
        type="button"
        onClick={handleStop}
        disabled={!isPlaying && progress === 0}
        className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-40 shadow-sm"
        title="Parar"
      >
        <Square size={10} fill="currentColor" />
      </button>

      <div className="w-16 h-2 bg-secondary/80 rounded-full overflow-hidden relative shrink-0 border border-border/30">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
