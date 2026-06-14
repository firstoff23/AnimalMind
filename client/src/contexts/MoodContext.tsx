import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { EventData, EmotionalState } from "@shared/types";

export type Mood = "calm" | "neutral" | "concerned";

interface MoodContextType {
  mood: Mood;
  latestEvent: EventData | null;
  isLoading: boolean;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

const MOOD_MAPPING: Record<EmotionalState, Mood> = {
  relaxed: "calm",
  excitement: "calm",
  attention: "neutral",
  alert: "neutral",
  distress: "concerned",
  hunger: "concerned",
};

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const { data: activeAnimal, isLoading: animalLoading } = trpc.animals.getActive.useQuery();

  // Fetch the latest classification event for the active animal
  const { data: eventsResult, isLoading: eventsLoading } = trpc.events.listForAnimal.useQuery(
    { animalId: activeAnimal?.id ?? 0, page: 1, pageSize: 1 },
    { enabled: !!activeAnimal }
  );

  const latestEvent = useMemo(() => {
    if (!eventsResult || !eventsResult.events || eventsResult.events.length === 0) {
      return null;
    }
    return eventsResult.events[0] as unknown as EventData;
  }, [eventsResult]);

  const [mood, setMood] = useState<Mood>(() => {
    const cached = localStorage.getItem("animalmind-mood");
    const initialMood = (cached as Mood) || "neutral";
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-mood", initialMood);
    }
    return initialMood;
  });

  useEffect(() => {
    let currentMood: Mood = "neutral";

    if (latestEvent) {
      const eventTime = new Date(latestEvent.createdAt).getTime();
      const now = new Date().getTime();
      const isWithin48h = now - eventTime <= 48 * 60 * 60 * 1000;

      if (isWithin48h && latestEvent.state in MOOD_MAPPING) {
        currentMood = MOOD_MAPPING[latestEvent.state];
      }
    }

    setMood(currentMood);
    localStorage.setItem("animalmind-mood", currentMood);
    document.documentElement.setAttribute("data-mood", currentMood);
  }, [latestEvent]);

  const value = useMemo(
    () => ({
      mood,
      latestEvent,
      isLoading: animalLoading || (!!activeAnimal && eventsLoading),
    }),
    [mood, latestEvent, animalLoading, activeAnimal, eventsLoading]
  );

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error("useMood must be used within a MoodProvider");
  }
  return context;
}
