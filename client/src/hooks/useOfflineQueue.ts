import { trpc } from "@/lib/trpc";
import {
  enqueuePendingRecording,
  getOfflineQueueSummary,
  isBrowserOffline,
  OFFLINE_QUEUE_CHANGED_EVENT,
  OFFLINE_QUEUE_CHANNEL,
  processPendingQueue,
  registerPendingRecordingsSync,
  type OfflineQueueSummary,
  type QueueRecordingInput,
} from "@/lib/offlineQueue";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UseOfflineQueueOptions = {
  autoProcess?: boolean;
};

const EMPTY_SUMMARY: OfflineQueueSummary = {
  totalCount: 0,
  pendingCount: 0,
  failedCount: 0,
  nextRetryAt: null,
};

export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const { autoProcess = true } = options;
  const utils = trpc.useUtils();
  const classifyMutation = trpc.classify.run.useMutation();
  const classifyRecording = classifyMutation.mutateAsync;
  const [summary, setSummary] = useState<OfflineQueueSummary>(EMPTY_SUMMARY);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSummary = useCallback(async () => {
    const nextSummary = await getOfflineQueueSummary();
    setSummary(nextSummary);
    return nextSummary;
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (isBrowserOffline() || isProcessingRef.current) {
      return await refreshSummary();
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await processPendingQueue((payload) =>
        classifyRecording(payload)
      );

      if (result.processed > 0) {
        await utils.events.recent.invalidate();
        toast.success(
          result.processed === 1
            ? "1 gravação offline sincronizada."
            : `${result.processed} gravações offline sincronizadas.`
        );
      }

      if (result.failed > 0 && result.summary.failedCount === 0) {
        toast.warning("Sincronização adiada. Vamos tentar novamente automaticamente.");
      }

      if (result.summary.failedCount > 0) {
        toast.error(
          result.summary.failedCount === 1
            ? "1 gravação offline falhou após 3 tentativas."
            : `${result.summary.failedCount} gravações offline falharam após 3 tentativas.`
        );
      }

      return result.summary;
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      await refreshSummary();
    }
  }, [classifyRecording, refreshSummary, utils.events.recent]);

  const scheduleNextRetry = useCallback(
    (nextSummary: OfflineQueueSummary) => {
      clearRetryTimer();

      if (!autoProcess || isBrowserOffline() || !nextSummary.nextRetryAt) {
        return;
      }

      const delay = Math.max(0, nextSummary.nextRetryAt - Date.now());
      retryTimerRef.current = setTimeout(() => {
        void processQueue();
      }, delay);
    },
    [autoProcess, clearRetryTimer, processQueue]
  );

  const enqueueRecording = useCallback(
    async (recording: QueueRecordingInput) => {
      const queued = await enqueuePendingRecording(recording);
      const nextSummary = await refreshSummary();
      scheduleNextRetry(nextSummary);
      toast.info(
        "Sem ligação. A gravação foi guardada e será sincronizada automaticamente."
      );
      return queued;
    },
    [refreshSummary, scheduleNextRetry]
  );

  useEffect(() => {
    let mounted = true;

    const update = async () => {
      const nextSummary = await getOfflineQueueSummary();
      if (!mounted) return;
      setSummary(nextSummary);
      scheduleNextRetry(nextSummary);
    };

    void update();

    const handleQueueChanged = () => {
      void update();
    };

    const handleOnline = () => {
      if (autoProcess) {
        void processQueue();
      } else {
        void update();
      }
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "process-pending-recordings" && autoProcess) {
        void processQueue();
      }
      if (event.data?.type === "offline-queue-changed") {
        void update();
      }
    };

    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(OFFLINE_QUEUE_CHANNEL);
      channel.onmessage = handleQueueChanged;
    }

    if (autoProcess && !isBrowserOffline()) {
      void processQueue();
    } else {
      void registerPendingRecordingsSync();
    }

    return () => {
      mounted = false;
      clearRetryTimer();
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, handleQueueChanged);
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
      channel?.close();
    };
  }, [autoProcess, clearRetryTimer, processQueue, scheduleNextRetry]);

  return {
    ...summary,
    isProcessing,
    enqueueRecording,
    processQueue,
    refreshSummary,
  };
}
