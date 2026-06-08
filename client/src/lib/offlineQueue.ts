import { createStore, del, entries, get, set } from "idb-keyval";

export const OFFLINE_QUEUE_SYNC_TAG = "pending-recordings";
export const OFFLINE_QUEUE_CHANGED_EVENT = "animalmind:offline-queue-changed";
export const OFFLINE_QUEUE_CHANNEL = "animalmind-offline-queue";

const DB_NAME = "animalmind-offline-queue";
const META_DB_NAME = "animalmind-offline-queue-meta";
const RECORDINGS_STORE = "recordings";
const META_STORE = "metadata";
const AUTH_KEY = "supabase-auth";
const BASE_BACKOFF_MS = 2_000;
export const MAX_OFFLINE_QUEUE_ATTEMPTS = 3;

const recordingsStore = createStore(DB_NAME, RECORDINGS_STORE);
const metaStore = createStore(META_DB_NAME, META_STORE);

export type QueuedClassificationPayload = {
  animalId?: number;
  audio?: string;
  audioMimeType?: string;
  posture?: string;
  pitch?: number;
  spectralEnergy?: number;
  tonalBrightness?: number;
};

export type PendingRecordingStatus = "pending" | "failed";

export type PendingRecording = {
  id: string;
  animalId?: number;
  timestamp: number;
  audioBlob: Blob;
  audioMimeType?: string;
  posture?: string;
  pitch?: number;
  spectralEnergy?: number;
  tonalBrightness?: number;
  attempts: number;
  nextAttemptAt: number;
  status: PendingRecordingStatus;
  lastError?: string;
};

export type QueueRecordingInput = Omit<
  PendingRecording,
  "id" | "attempts" | "nextAttemptAt" | "status" | "lastError" | "timestamp"
> & {
  timestamp?: number;
};

export type OfflineQueueSummary = {
  totalCount: number;
  pendingCount: number;
  failedCount: number;
  nextRetryAt: number | null;
};

export type OfflineQueueProcessResult = {
  processed: number;
  failed: number;
  deferred: number;
  summary: OfflineQueueSummary;
};

export type OfflineQueueAuth = {
  accessToken: string;
  expiresAt: number;
};

type QueueChangedMessage = {
  type: "offline-queue-changed";
};

function createRecordingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `recording-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT));
  }

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(OFFLINE_QUEUE_CHANNEL);
    channel.postMessage({ type: "offline-queue-changed" } satisfies QueueChangedMessage);
    channel.close();
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getNextAttemptAt(attempts: number, now: number) {
  return now + BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1);
}

export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex += 1) {
      binary += String.fromCharCode(chunk[chunkIndex]);
    }
  }

  return btoa(binary);
}

export async function enqueuePendingRecording(input: QueueRecordingInput) {
  const timestamp = input.timestamp ?? Date.now();
  const recording: PendingRecording = {
    ...input,
    id: createRecordingId(),
    timestamp,
    attempts: 0,
    nextAttemptAt: timestamp,
    status: "pending",
  };

  await set(recording.id, recording, recordingsStore);
  emitQueueChanged();
  await registerPendingRecordingsSync();

  return recording;
}

export async function getPendingRecordings() {
  const rows = await entries<string, PendingRecording>(recordingsStore);
  return rows
    .map(([, recording]) => recording)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function getOfflineQueueSummary(): Promise<OfflineQueueSummary> {
  const recordings = await getPendingRecordings();
  const pending = recordings.filter((recording) => recording.status === "pending");
  const retryTimes = pending
    .map((recording) => recording.nextAttemptAt)
    .filter((value) => Number.isFinite(value));

  return {
    totalCount: recordings.length,
    pendingCount: pending.length,
    failedCount: recordings.filter((recording) => recording.status === "failed").length,
    nextRetryAt: retryTimes.length > 0 ? Math.min(...retryTimes) : null,
  };
}

export async function storeOfflineQueueAuth(auth: OfflineQueueAuth | null) {
  if (!auth?.accessToken) {
    await del(AUTH_KEY, metaStore);
    return;
  }

  await set(AUTH_KEY, auth, metaStore);
}

export async function getOfflineQueueAuth() {
  return get<OfflineQueueAuth>(AUTH_KEY, metaStore);
}

export async function registerPendingRecordingsSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };

    if (!syncRegistration.sync) return false;

    await syncRegistration.sync.register(OFFLINE_QUEUE_SYNC_TAG);
    return true;
  } catch (error) {
    console.warn("[OfflineQueue] Failed to register background sync:", error);
    return false;
  }
}

export async function processPendingQueue(
  classify: (payload: QueuedClassificationPayload) => Promise<unknown>,
  now = Date.now()
): Promise<OfflineQueueProcessResult> {
  const recordings = await getPendingRecordings();
  const dueRecordings = recordings.filter(
    (recording) => recording.status === "pending" && recording.nextAttemptAt <= now
  );

  let processed = 0;
  let failed = 0;
  const deferred = recordings.filter(
    (recording) => recording.status === "pending" && recording.nextAttemptAt > now
  ).length;

  for (const recording of dueRecordings) {
    try {
      const audio = await blobToBase64(recording.audioBlob);
      await classify({
        animalId: recording.animalId,
        audio,
        audioMimeType: recording.audioMimeType,
        posture: recording.posture,
        pitch: recording.pitch,
        spectralEnergy: recording.spectralEnergy,
        tonalBrightness: recording.tonalBrightness,
      });
      await del(recording.id, recordingsStore);
      processed += 1;
    } catch (error) {
      const attempts = recording.attempts + 1;
      const status: PendingRecordingStatus =
        attempts >= MAX_OFFLINE_QUEUE_ATTEMPTS ? "failed" : "pending";

      await set(
        recording.id,
        {
          ...recording,
          attempts,
          status,
          nextAttemptAt:
            status === "pending" ? getNextAttemptAt(attempts, now) : Number.POSITIVE_INFINITY,
          lastError: getErrorMessage(error),
        } satisfies PendingRecording,
        recordingsStore
      );
      failed += 1;
    }
  }

  if (processed > 0 || failed > 0) {
    emitQueueChanged();
  }

  const summary = await getOfflineQueueSummary();

  if (summary.pendingCount > 0) {
    await registerPendingRecordingsSync();
  }

  return { processed, failed, deferred, summary };
}
