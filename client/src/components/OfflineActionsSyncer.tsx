import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { processOfflineActions } from "@/lib/offlineQueueActions";
import { trpc } from "@/lib/trpc";

export function OfflineActionsSyncer() {
  const addAnimalMutation = trpc.animals.add.useMutation();
  const updateNotesMutation = trpc.events.updateNotes.useMutation();

  const sync = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const result = await processOfflineActions({
          addAnimal: (payload) => addAnimalMutation.mutateAsync(payload),
          updateNotes: (payload) => updateNotesMutation.mutateAsync(payload),
        });
        if (result && result.processed > 0) {
          toast.success(
            result.processed === 1
              ? "1 ação guardada offline foi sincronizada."
              : `${result.processed} ações guardadas offline foram sincronizadas.`,
          );
        }
      } catch (err) {
        console.error("[OfflineActionsSyncer] Error processing queue:", err);
      }
    }
  }, [addAnimalMutation, updateNotesMutation]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("online", sync);
    // Attempt sync on mount
    sync();

    return () => {
      window.removeEventListener("online", sync);
    };
  }, [sync]);

  return null;
}
