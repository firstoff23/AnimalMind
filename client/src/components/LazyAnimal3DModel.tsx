import React, { useState, useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { EmotionalState } from "../../../shared/types";

// Dynamic import of the R3F Canvas component
const Animal3DModel = React.lazy(() => import("./Animal3DModel"));

// Detection helper for WebGL
function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

interface LazyAnimal3DModelProps {
  species: "dog" | "cat";
  emotion: EmotionalState | string;
  photoUrl?: string | null;
  name: string;
}

export default function LazyAnimal3DModel({
  species,
  emotion,
  photoUrl,
  name,
}: LazyAnimal3DModelProps) {
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);
  const [isInView, setIsInView] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check support on mount
  useEffect(() => {
    setWebGLSupported(checkWebGLSupport());
  }, []);

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    if (!webGLSupported) return;

    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Once visible, we can disconnect to stop observing
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Trigger slightly before it enters the viewport
        threshold: 0.01,
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [webGLSupported]);

  // Fallback visual: photo if available, otherwise animal emoji/icon
  const renderFallback = () => {
    if (photoUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/60 p-1">
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900/40 rounded-2xl select-none">
        <span className="text-7xl animate-pulse">
          {species === "dog" ? "🐕" : "🐈"}
        </span>
        <span className="text-xs text-muted-foreground">
          {species === "dog" ? "Cão" : "Gato"}
        </span>
      </div>
    );
  };

  if (!webGLSupported) {
    return (
      <div className="w-full h-full rounded-2xl border border-border bg-card overflow-hidden">
        {renderFallback()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl border border-border/80 bg-card overflow-hidden relative shadow-md"
    >
      {isInView ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <Animal3DModel species={species} emotion={emotion} />
        </Suspense>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
