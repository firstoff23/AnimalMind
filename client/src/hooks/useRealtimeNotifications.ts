import { trpc } from "@/lib/trpc";
import { supabase } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { EmotionalState } from "../../../shared/types";
import { STATE_LABELS } from "../../../shared/types";
import { useEffect, useMemo } from "react";

type ClassificationEventRow = {
  id: number | string;
  user_id: number | string;
  animal_id: number | string | null;
  state: string;
  confidence: number | string;
  created_at?: string | null;
};

function isEmotionalState(value: string): value is EmotionalState {
  return Object.prototype.hasOwnProperty.call(STATE_LABELS, value);
}

export function useRealtimeNotifications(enabled = true) {
  const utils = trpc.useUtils();
  const { requestNotificationPermission, sendClassificationNotification } = useNotifications();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const animalsQuery = trpc.animals.list.useQuery(undefined, {
    enabled: enabled && Boolean(meQuery.data?.id),
    refetchOnWindowFocus: false,
  });

  const animalNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const animal of animalsQuery.data ?? []) {
      map.set(Number(animal.id), animal.name);
    }
    return map;
  }, [animalsQuery.data]);

  useEffect(() => {
    if (!enabled || !supabase || !meQuery.data?.id) return;

    const realtimeClient = supabase;
    const userId = Number(meQuery.data.id);
    if (!Number.isFinite(userId)) return;

    void requestNotificationPermission();

    const channel = realtimeClient
      .channel(`classification-events-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "classification_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as ClassificationEventRow;
          if (!row?.state || !isEmotionalState(row.state)) return;

          const eventId = Number(row.id);
          const animalId = row.animal_id === null ? null : Number(row.animal_id);
          const confidence = Number(row.confidence);
          const animalName =
            animalId !== null ? animalNames.get(animalId) ?? "Animal" : "Animal";

          sendClassificationNotification(
            row.state,
            Number.isFinite(confidence) ? confidence : 0,
            animalName,
            Number.isFinite(eventId) ? eventId : undefined
          );

          void utils.events.recent.invalidate();
          void utils.events.list.invalidate();
          void utils.events.listForAnimal.invalidate();
          void utils.animals.weeklyStats.invalidate();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[Realtime] classification_events channel error.");
        }
      });

    return () => {
      void realtimeClient.removeChannel(channel);
    };
  }, [
    animalNames,
    enabled,
    meQuery.data?.id,
    requestNotificationPermission,
    sendClassificationNotification,
    utils.animals.weeklyStats,
    utils.events.list,
    utils.events.listForAnimal,
    utils.events.recent,
  ]);
}
