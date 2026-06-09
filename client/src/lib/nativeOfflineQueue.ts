import { base64ToBlob, blobToBase64 } from "@/lib/blobEncoding";
import type { PendingRecording } from "@/lib/offlineQueue";

type SQLiteDBConnection = import("@capacitor-community/sqlite").SQLiteDBConnection;

const DATABASE_NAME = "animalmind_offline";
const DATABASE_VERSION = 1;

let dbPromise: Promise<SQLiteDBConnection | null> | null = null;

async function isNativePlatform() {
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function getDatabase() {
  if (!(await isNativePlatform())) {
    return null;
  }

  dbPromise ??= (async () => {
    try {
      const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
      const sqlite = new SQLiteConnection(CapacitorSQLite);

      await sqlite.checkConnectionsConsistency();

      const existingConnection = await sqlite.isConnection(DATABASE_NAME, false);
      const db = existingConnection.result
        ? await sqlite.retrieveConnection(DATABASE_NAME, false)
        : await sqlite.createConnection(
            DATABASE_NAME,
            false,
            "no-encryption",
            DATABASE_VERSION,
            false
          );

      const openState = await db.isDBOpen();
      if (!openState.result) {
        await db.open();
      }

      await db.execute(
        `
        CREATE TABLE IF NOT EXISTS pending_recordings (
          id TEXT PRIMARY KEY NOT NULL,
          animal_id INTEGER,
          timestamp INTEGER NOT NULL,
          audio_base64 TEXT NOT NULL,
          audio_mime_type TEXT,
          posture TEXT,
          pitch REAL,
          spectral_energy REAL,
          tonal_brightness REAL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'failed')),
          last_error TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pending_recordings_status_next_attempt
          ON pending_recordings(status, next_attempt_at);

        CREATE INDEX IF NOT EXISTS idx_pending_recordings_timestamp
          ON pending_recordings(timestamp);
        `
      );

      return db;
    } catch (error) {
      console.warn("[NativeOfflineQueue] SQLite unavailable, using IndexedDB fallback:", error);
      return null;
    }
  })();

  return dbPromise;
}

function rowToPendingRecording(row: Record<string, unknown>): PendingRecording {
  const audioMimeType =
    typeof row.audio_mime_type === "string" ? row.audio_mime_type : undefined;

  return {
    id: String(row.id),
    animalId: typeof row.animal_id === "number" ? row.animal_id : undefined,
    timestamp: Number(row.timestamp),
    audioBlob: base64ToBlob(String(row.audio_base64), audioMimeType),
    audioMimeType,
    posture: typeof row.posture === "string" ? row.posture : undefined,
    pitch: typeof row.pitch === "number" ? row.pitch : undefined,
    spectralEnergy:
      typeof row.spectral_energy === "number" ? row.spectral_energy : undefined,
    tonalBrightness:
      typeof row.tonal_brightness === "number" ? row.tonal_brightness : undefined,
    attempts: Number(row.attempts),
    nextAttemptAt: Number(row.next_attempt_at),
    status: row.status === "failed" ? "failed" : "pending",
    lastError: typeof row.last_error === "string" ? row.last_error : undefined,
  };
}

export async function saveNativePendingRecording(recording: PendingRecording) {
  const db = await getDatabase();
  if (!db) return false;

  const audioBase64 = await blobToBase64(recording.audioBlob);
  const now = Date.now();

  await db.run(
    `
    INSERT OR REPLACE INTO pending_recordings (
      id,
      animal_id,
      timestamp,
      audio_base64,
      audio_mime_type,
      posture,
      pitch,
      spectral_energy,
      tonal_brightness,
      attempts,
      next_attempt_at,
      status,
      last_error,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(
      (SELECT created_at FROM pending_recordings WHERE id = ?),
      ?
    ), ?)
    `,
    [
      recording.id,
      recording.animalId ?? null,
      recording.timestamp,
      audioBase64,
      recording.audioMimeType ?? null,
      recording.posture ?? null,
      recording.pitch ?? null,
      recording.spectralEnergy ?? null,
      recording.tonalBrightness ?? null,
      recording.attempts,
      recording.nextAttemptAt,
      recording.status,
      recording.lastError ?? null,
      recording.id,
      now,
      now,
    ]
  );

  return true;
}

export async function getNativePendingRecordings() {
  const db = await getDatabase();
  if (!db) return null;

  const result = await db.query(
    `
    SELECT
      id,
      animal_id,
      timestamp,
      audio_base64,
      audio_mime_type,
      posture,
      pitch,
      spectral_energy,
      tonal_brightness,
      attempts,
      next_attempt_at,
      status,
      last_error
    FROM pending_recordings
    ORDER BY timestamp ASC
    `
  );

  return (result.values ?? []).map((row) =>
    rowToPendingRecording(row as Record<string, unknown>)
  );
}

export async function deleteNativePendingRecording(id: string) {
  const db = await getDatabase();
  if (!db) return false;

  await db.run("DELETE FROM pending_recordings WHERE id = ?", [id]);
  return true;
}

export async function updateNativePendingRecording(recording: PendingRecording) {
  return saveNativePendingRecording(recording);
}
