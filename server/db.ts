import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import type { InsertUser } from "../drizzle/schema";
import fs from "fs";
import path from "path";

let _supabase: SupabaseClient<any> | null = null;
export const AUDIO_RECORDINGS_BUCKET = "audio-recordings";

// Lazy init Supabase client
// Use Service Role Key for backend operations (has full permissions)
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY");
    }
    _supabase = createClient<any>(url, key);
  }
  return _supabase;
}

// ─── User operations ──────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const supabase = getSupabase();
  const values: Record<string, any> = {
    open_id: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    login_method: user.loginMethod ?? null,
    last_signed_in: new Date().toISOString(),
  };

  if (user.role) values.role = user.role;
  else if (user.openId === ENV.ownerOpenId) values.role = "admin";

  const { error } = await supabase
    .from("users")
    .upsert([values], { onConflict: "open_id" });

  if (error) throw error;
}

export async function getUserByOpenId(openId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data;
}

export async function getDemoUserId(): Promise<number | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("open_id", "demo-user-001")
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data?.id ?? null;
}

export async function getOrCreateDemoUserId(userId: number): Promise<number> {
  const demoId = await getDemoUserId();
  return demoId ?? userId;
}

// ─── Animal operations ────────────────────────────────────────────────────────

export async function getAnimalsByUser(userId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const owned = (data || []).map((a: any) => ({
    ...a,
    isShared: false,
    permission: "write" as const,
  }));

  const shared = await getSharedAnimalsForUser(userId);

  return [...owned, ...shared];
}

export async function addAnimal(data: {
  userId: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
}) {
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from("animals")
    .insert([
      {
        user_id: data.userId,
        name: data.name,
        species: data.species,
        breed: data.breed,
        age: data.age,
        is_active: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function setActiveAnimal(animalId: number, userId: number) {
  await verifyAnimalOwner(animalId, userId);
  const supabase = getSupabase();

  // Deactivate all owned by this user
  await supabase
    .from("animals")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Activate target
  const { error } = await supabase
    .from("animals")
    .update({ is_active: true })
    .eq("id", animalId);

  if (error) throw error;
}

export async function getActiveAnimal(userId: number) {
  const supabase = getSupabase();
  
  // First check if there is an active owned animal
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (!error && data) {
    return { ...data, isShared: false, permission: "write" };
  }

  // Otherwise check shared animals
  const shared = await getSharedAnimalsForUser(userId);
  const activeShared = shared.find((a) => a.is_active);
  if (activeShared) {
    return activeShared;
  }

  // Fallback to first available animal
  const all = await getAnimalsByUser(userId);
  return all[0] || null;
}

// ─── Event operations ────────────────────────────────────────────────────────

export async function insertEvent(data: {
  userId: number;
  animalId: number;
  state: string;
  confidence: number;
  emoji: string;
  modelUsed: string;
  cached?: boolean;
  audioUrl?: string | null;
}) {
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from("classification_events")
    .insert([
      {
        user_id: data.userId,
        animal_id: data.animalId,
        state: data.state,
        confidence: data.confidence,
        emoji: data.emoji,
        model_used: data.modelUsed,
        cached: data.cached ?? false,
        audio_url: data.audioUrl ?? null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getRecentEvents(userId: number, limit = 5) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("classification_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  const notes = readNotesFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: e.audio_url ?? null,
  }));
  return events;
}

export async function getEventsPaginated(
  userId: number,
  page: number,
  pageSize: number,
  state?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const supabase = getSupabase();
  let query = supabase
    .from("classification_events")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (state && state !== "all") query = query.eq("state", state);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const offset = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  
  const notes = readNotesFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: e.audio_url ?? null,
  }));
  return { events, total: count || 0 };
}

export async function updateEventFeedback(
  eventId: number,
  userId: number,
  feedback: "correct" | "incorrect"
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("classification_events")
    .update({ feedback })
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getAllEventsForExport(
  userId: number,
  filters: {
    state?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const supabase = getSupabase();
  let query = supabase
    .from("classification_events")
    .select("*, animals(name, species)")
    .eq("user_id", userId);

  if (filters.state && filters.state !== "all") query = query.eq("state", filters.state);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getWeeklyStats(userId: number, animalId?: number) {
  const supabase = getSupabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let query = supabase
    .from("classification_events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", weekAgo.toISOString());

  if (animalId) query = query.eq("animal_id", animalId);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ─── Settings operations ──────────────────────────────────────────────────────

export async function getSettings(userId: number) {
  const supabase = getSupabase();
  let { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  // If not found, create default
  if (error && error.code === "PGRST116") {
    const { data: newSettings, error: insertError } = await supabase
      .from("settings")
      .insert([
        {
          user_id: userId,
          notifications_enabled: true,
          alert_sensitivity: "medium",
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;
    return newSettings as any;
  }

  if (error) throw error;
  return data;
}

export async function upsertSettings(
  userId: number,
  data: { notificationsEnabled?: boolean; alertSensitivity?: "low" | "medium" | "high" }
) {
  const supabase = getSupabase();
  const updates: Record<string, any> = {};

  if (data.notificationsEnabled !== undefined)
    updates.notifications_enabled = data.notificationsEnabled;
  if (data.alertSensitivity !== undefined)
    updates.alert_sensitivity = data.alertSensitivity;

  const { data: result, error } = await supabase
    .from("settings")
    .upsert(
      [{ user_id: userId, ...updates }],
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return result as any;
}

// ─── Event Notes operations (Local File Persistence) ─────────────────────────

const NOTES_FILE_PATH = path.resolve(import.meta.dirname, "notes.json");

function readNotesFromFile(): Record<number, string> {
  try {
    if (fs.existsSync(NOTES_FILE_PATH)) {
      const content = fs.readFileSync(NOTES_FILE_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Notes] Failed to read notes:", error);
  }
  return {};
}

function writeNotesToFile(notes: Record<number, string>) {
  try {
    fs.writeFileSync(NOTES_FILE_PATH, JSON.stringify(notes, null, 2), "utf8");
  } catch (error) {
    console.error("[Notes] Failed to write notes:", error);
  }
}

export async function getEventNotes(eventId: number): Promise<string> {
  const notes = readNotesFromFile();
  return notes[eventId] || "";
}

export async function updateEventNotes(eventId: number, noteText: string): Promise<string> {
  const notes = readNotesFromFile();
  notes[eventId] = noteText;
  writeNotesToFile(notes);
  return noteText;
}

// ─── Event Audio operations (Supabase Storage + classification_events.audio_url) ──────

export async function getEventAudio(eventId: number): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("classification_events")
    .select("audio_url")
    .eq("id", eventId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.audio_url ?? "";
}

export async function updateEventAudio(eventId: number, audioUrl: string): Promise<string> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("classification_events")
    .update({ audio_url: audioUrl })
    .eq("id", eventId);

  if (error) throw error;
  return audioUrl;
}

export async function uploadAudioToSupabase(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabase();

  try {
    await supabase.storage.createBucket(AUDIO_RECORDINGS_BUCKET, {
      public: true,
      allowedMimeTypes: ["audio/webm", "audio/wav", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/x-m4a"],
    });
  } catch (err) {
    // Ignore bucket creation if already exists
  }

  const { data, error } = await supabase.storage
    .from(AUDIO_RECORDINGS_BUCKET)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[Storage] Supabase upload failed:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(AUDIO_RECORDINGS_BUCKET)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// ─── Animal Baseline operations (Supabase JSONB + local fallback) ────────────

export interface AnimalBaseline {
  vocalizationThreshold: number;
  normalStates: string[];
  alertSensitivity: "low" | "medium" | "high";
  stateDistribution: Record<string, number>;
  typicalStates: string[];
  sampleSize: number;
  calculatedFrom: string | null;
  calculatedTo: string | null;
  updatedAt: string;
}

const BASELINES_FILE_PATH = path.resolve(import.meta.dirname, "baselines.json");

const DEFAULT_STATE_DISTRIBUTION: Record<string, number> = {
  relaxed: 0.5,
  excitement: 0.2,
  distress: 0,
  hunger: 0.1,
  alert: 0,
  attention: 0.2,
};

const DEFAULT_BASELINE: AnimalBaseline = {
  vocalizationThreshold: 10,
  normalStates: ["relaxed", "excitement"],
  alertSensitivity: "medium",
  stateDistribution: DEFAULT_STATE_DISTRIBUTION,
  typicalStates: ["relaxed", "excitement"],
  sampleSize: 0,
  calculatedFrom: null,
  calculatedTo: null,
  updatedAt: new Date(0).toISOString(),
};

function normalizeAnimalBaseline(data: Partial<AnimalBaseline> | null | undefined): AnimalBaseline {
  return {
    ...DEFAULT_BASELINE,
    ...data,
    vocalizationThreshold: data?.vocalizationThreshold ?? DEFAULT_BASELINE.vocalizationThreshold,
    normalStates: data?.normalStates ?? DEFAULT_BASELINE.normalStates,
    alertSensitivity: data?.alertSensitivity ?? DEFAULT_BASELINE.alertSensitivity,
    stateDistribution: {
      ...DEFAULT_STATE_DISTRIBUTION,
      ...(data?.stateDistribution ?? {}),
    },
    typicalStates: data?.typicalStates ?? data?.normalStates ?? DEFAULT_BASELINE.typicalStates,
    sampleSize: data?.sampleSize ?? 0,
    calculatedFrom: data?.calculatedFrom ?? null,
    calculatedTo: data?.calculatedTo ?? null,
    updatedAt: data?.updatedAt ?? new Date().toISOString(),
  };
}

function readBaselinesFromFile(): Record<number, AnimalBaseline> {
  try {
    if (fs.existsSync(BASELINES_FILE_PATH)) {
      const content = fs.readFileSync(BASELINES_FILE_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Baselines] Failed to read baselines:", error);
  }
  return {};
}

function writeBaselinesToFile(baselines: Record<number, AnimalBaseline>) {
  try {
    fs.writeFileSync(BASELINES_FILE_PATH, JSON.stringify(baselines, null, 2), "utf8");
  } catch (error) {
    console.error("[Baselines] Failed to write baselines:", error);
  }
}

async function readBaselineFromDatabase(animalId: number): Promise<AnimalBaseline | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("animals")
      .select("baseline_data")
      .eq("id", animalId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data?.baseline_data ? normalizeAnimalBaseline(data.baseline_data) : null;
  } catch (error) {
    console.warn("[Baselines] Falling back to local baseline read:", error);
    return null;
  }
}

async function persistBaselineToDatabase(animalId: number, baseline: AnimalBaseline): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("animals")
      .update({ baseline_data: baseline })
      .eq("id", animalId);
    if (error) throw error;
  } catch (error) {
    console.warn("[Baselines] Could not persist baseline_data in Supabase:", error);
  }
}

export async function getAnimalBaseline(animalId: number): Promise<AnimalBaseline> {
  const databaseBaseline = await readBaselineFromDatabase(animalId);
  if (databaseBaseline) {
    return databaseBaseline;
  }

  const baselines = readBaselinesFromFile();
  const baseline = baselines[animalId];
  if (baseline) {
    return normalizeAnimalBaseline(baseline);
  }
  
  return normalizeAnimalBaseline({ updatedAt: new Date().toISOString() });
}

export async function updateAnimalBaseline(
  animalId: number,
  data: {
    vocalizationThreshold?: number;
    normalStates?: string[];
    alertSensitivity?: "low" | "medium" | "high";
  }
): Promise<AnimalBaseline> {
  const baselines = readBaselinesFromFile();
  const current = await getAnimalBaseline(animalId);

  const updated: AnimalBaseline = {
    ...current,
    vocalizationThreshold: data.vocalizationThreshold ?? current.vocalizationThreshold,
    normalStates: data.normalStates ?? current.normalStates,
    alertSensitivity: data.alertSensitivity ?? current.alertSensitivity,
    updatedAt: new Date().toISOString(),
  };

  baselines[animalId] = updated;
  writeBaselinesToFile(baselines);
  await persistBaselineToDatabase(animalId, updated);
  return updated;
}

export function buildBehaviorBaselineFromEvents(
  events: Array<{ state: string; created_at?: string | Date | null }>,
  current: Partial<AnimalBaseline> = {},
  calculatedFrom: string | null = null,
  calculatedTo: string | null = new Date().toISOString()
): AnimalBaseline {
  const base = normalizeAnimalBaseline(current);
  const counts = STATES_LIST.reduce<Record<string, number>>((acc, state) => {
    acc[state] = 0;
    return acc;
  }, {});

  events.forEach((event) => {
    if (event.state in counts) counts[event.state] += 1;
  });

  const sampleSize = events.length;
  const stateDistribution = STATES_LIST.reduce<Record<string, number>>((acc, state) => {
    acc[state] = sampleSize > 0 ? Math.round((counts[state] / sampleSize) * 100) / 100 : 0;
    return acc;
  }, {});

  const typicalStates =
    sampleSize > 0
      ? STATES_LIST.filter((state) => stateDistribution[state] >= 0.15)
      : base.typicalStates;

  return {
    ...base,
    stateDistribution,
    typicalStates: typicalStates.length > 0 ? typicalStates : base.typicalStates,
    sampleSize,
    calculatedFrom,
    calculatedTo,
    updatedAt: new Date().toISOString(),
  };
}

export async function recalculateAnimalBehaviorBaseline(
  animalId: number,
  userId?: number
): Promise<AnimalBaseline> {
  const supabase = getSupabase();
  const calculatedTo = new Date().toISOString();
  const since = new Date();
  since.setDate(since.getDate() - 28);
  const calculatedFrom = since.toISOString();

  let query = supabase
    .from("classification_events")
    .select("state, created_at")
    .eq("animal_id", animalId)
    .gte("created_at", calculatedFrom);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;

  const current = await getAnimalBaseline(animalId);
  const updated = buildBehaviorBaselineFromEvents(
    data || [],
    current,
    calculatedFrom,
    calculatedTo
  );

  const baselines = readBaselinesFromFile();
  baselines[animalId] = updated;
  writeBaselinesToFile(baselines);
  await persistBaselineToDatabase(animalId, updated);
  return updated;
}

export async function verifyAnimalOwner(
  animalId: number,
  userId: number,
  requireWrite = false
): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("animals")
    .select("user_id")
    .eq("id", animalId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Animal não encontrado");
    }
    throw error;
  }

  if (Number(data.user_id) === userId) {
    return; // Owner has full access
  }

  // Check if there is an active share
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user || !user.email) {
    throw new Error("Não autorizado");
  }

  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const share = shares.find(
    (s: FamilyShare) =>
      s.animalId === animalId &&
      s.sharedWithEmail.toLowerCase() === user.email.toLowerCase() &&
      s.status === "accepted"
  );

  if (!share) {
    throw new Error("Não autorizado");
  }

  if (requireWrite && share.permission !== "write") {
    throw new Error("Acesso de leitura apenas. Não autorizado a escrever.");
  }
}

export async function getAnimalById(animalId: number, userId: number) {
  const supabase = getSupabase();
  
  // Try owned first
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("id", animalId)
    .eq("user_id", userId)
    .single();

  if (!error && data) {
    return { ...data, isShared: false, permission: "write" };
  }

  // Check if shared
  const shared = await getSharedAnimalsForUser(userId);
  const matched = shared.find((a) => a.id === animalId);
  return matched || null;
}

export async function getEventsForAnimalPaginated(
  animalId: number,
  userId: number,
  page: number,
  pageSize: number
) {
  const supabase = getSupabase();
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from("classification_events")
    .select("*", { count: "exact" })
    .eq("animal_id", animalId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const notes = readNotesFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: e.audio_url ?? null,
  }));

  return { events, total: count || 0 };
}

export async function getStatsForAnimal(animalId: number, userId: number, days = 7) {
  const supabase = getSupabase();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const { data: events, error } = await supabase
    .from("classification_events")
    .select("*")
    .eq("animal_id", animalId)
    .eq("user_id", userId)
    .gte("created_at", sinceDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  const dayStats: Record<string, { count: number; sumConfidence: number }> = {};
  const stateCounts: Record<string, number> = {};

  // Pre-fill days to avoid gaps in chart
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dayStats[dateStr] = { count: 0, sumConfidence: 0 };
  }

  const list = events || [];
  for (const event of list) {
    const dateStr = new Date(event.created_at).toISOString().split("T")[0];
    if (!dayStats[dateStr]) {
      dayStats[dateStr] = { count: 0, sumConfidence: 0 };
    }
    dayStats[dateStr].count++;
    dayStats[dateStr].sumConfidence += Number(event.confidence);

    stateCounts[event.state] = (stateCounts[event.state] || 0) + 1;
  }

  const dailyActivity = Object.entries(dayStats)
    .map(([date, val]) => ({
      date,
      count: val.count,
      avgConfidence: val.count > 0 ? Math.round((val.sumConfidence / val.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    dailyActivity,
    stateDistribution: stateCounts,
    totalCount: list.length,
  };
}

// ─── POMDP Belief State & Posture & Vet sharing ──────────────────────────────

export interface BeliefState {
  relaxed: number;
  excitement: number;
  distress: number;
  hunger: number;
  alert: number;
  attention: number;
  updatedAt: string;
}

const BELIEF_STATES_FILE_PATH = path.resolve(import.meta.dirname, "belief_states.json");
const POSTURES_FILE_PATH = path.resolve(import.meta.dirname, "postures.json");
const VET_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "vet_shares.json");

function readJsonFile<T>(filePath: string): Record<string | number, T> {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`[DB] Failed to read JSON file ${filePath}:`, error);
  }
  return {};
}

function writeJsonFile<T>(filePath: string, data: Record<string | number, T>) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error(`[DB] Failed to write JSON file ${filePath}:`, error);
  }
}

// Belief State updates
export async function getEventBeliefState(eventId: number): Promise<BeliefState | null> {
  const fileData = readJsonFile<BeliefState>(BELIEF_STATES_FILE_PATH);
  return fileData[eventId] || null;
}

export async function getLatestBeliefState(animalId: number): Promise<BeliefState> {
  const supabase = getSupabase();
  
  // Find most recent event for this animal
  const { data: recentEvent, error } = await supabase
    .from("classification_events")
    .select("id, created_at")
    .eq("animal_id", animalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const defaultBelief: BeliefState = {
    relaxed: 0.5,
    excitement: 0.1,
    distress: 0.1,
    hunger: 0.1,
    alert: 0.1,
    attention: 0.1,
    updatedAt: new Date().toISOString()
  };

  if (error || !recentEvent) {
    return defaultBelief;
  }

  const beliefStates = readJsonFile<BeliefState>(BELIEF_STATES_FILE_PATH);
  const state = beliefStates[recentEvent.id];

  if (!state) {
    return defaultBelief;
  }

  // Check if it was in the last 30 minutes, otherwise decay to default
  const lastTime = new Date(state.updatedAt).getTime();
  const now = Date.now();
  const diffMinutes = (now - lastTime) / (1000 * 60);

  if (diffMinutes > 30) {
    // Slowly return to relaxed default (decay)
    return defaultBelief;
  }

  return state;
}

export async function updateBeliefStateForAnimal(
  animalId: number,
  observedState: string,
  confidence: number,
  eventId: number
): Promise<BeliefState> {
  const lastBelief = await getLatestBeliefState(animalId);
  const baseline = await getAnimalBaseline(animalId);

  // Calibrate learning rate (alpha) based on alert sensitivity
  let alpha = 0.3;
  if (baseline.alertSensitivity === "high") {
    // Sensitive alerts (fast update to distress/alert)
    alpha = (observedState === "distress" || observedState === "alert") ? 0.6 : 0.4;
  } else if (baseline.alertSensitivity === "low") {
    // Resilient alerts (filter transient vocalizations)
    alpha = (observedState === "distress" || observedState === "alert") ? 0.15 : 0.3;
  }

  const baselineFrequency = baseline.stateDistribution?.[observedState] ?? 0;
  const isRareForAnimal = baseline.sampleSize >= 5 && baselineFrequency < 0.1;
  if (isRareForAnimal) {
    alpha = Math.min(alpha + 0.15, 0.75);
  }

  const updated: Record<string, number> = {
    relaxed: lastBelief.relaxed,
    excitement: lastBelief.excitement,
    distress: lastBelief.distress,
    hunger: lastBelief.hunger,
    alert: lastBelief.alert,
    attention: lastBelief.attention
  };

  // Bayesian update rule
  STATES_LIST.forEach((s) => {
    const isObserved = s === observedState;
    const observationWeight = isObserved ? confidence : 0;
    updated[s] = (1 - alpha) * (updated[s] ?? 0.1) + alpha * observationWeight;
  });

  // Normalize probabilities to sum up to 1.0
  const sum = Object.values(updated).reduce((a, b) => a + b, 0);
  STATES_LIST.forEach((s) => {
    updated[s] = Math.round(((updated[s] ?? 0.1) / (sum || 1)) * 100) / 100;
  });

  const finalBelief: BeliefState = {
    relaxed: updated.relaxed ?? 0,
    excitement: updated.excitement ?? 0,
    distress: updated.distress ?? 0,
    hunger: updated.hunger ?? 0,
    alert: updated.alert ?? 0,
    attention: updated.attention ?? 0,
    updatedAt: new Date().toISOString()
  };

  const beliefStates = readJsonFile<BeliefState>(BELIEF_STATES_FILE_PATH);
  beliefStates[eventId] = finalBelief;
  writeJsonFile<BeliefState>(BELIEF_STATES_FILE_PATH, beliefStates);

  return finalBelief;
}

const STATES_LIST = ["relaxed", "excitement", "distress", "hunger", "alert", "attention"];

// Postures
export async function getEventPosture(eventId: number): Promise<string | null> {
  const postures = readJsonFile<string>(POSTURES_FILE_PATH);
  return postures[eventId] || null;
}

export async function savePostureForEvent(eventId: number, posture: string): Promise<string> {
  const postures = readJsonFile<string>(POSTURES_FILE_PATH);
  postures[eventId] = posture;
  writeJsonFile<string>(POSTURES_FILE_PATH, postures);
  return posture;
}

// Vet Shares
export async function shareReportWithVet(
  animalId: number,
  data: { name: string; email: string; note: string }
): Promise<boolean> {
  const shares = readJsonFile<any>(VET_SHARES_FILE_PATH);
  const animalShares = shares[animalId] || [];
  
  animalShares.push({
    ...data,
    sharedAt: new Date().toISOString()
  });

  shares[animalId] = animalShares;
  writeJsonFile<any>(VET_SHARES_FILE_PATH, shares);
  return true;
}

// ─── Family sharing persistence ──────────────────────────────────────────────

export interface FamilyShare {
  id: number;
  ownerId: number;
  animalId: number;
  sharedWithEmail: string;
  sharedWithUserId: number | null;
  permission: "read" | "write";
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

const FAMILY_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "family_shares.json");

export async function getUserByEmail(email: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function createShareInvitation(
  ownerId: number,
  animalId: number,
  targetEmail: string,
  permission: "read" | "write"
): Promise<FamilyShare> {
  const targetUser = await getUserByEmail(targetEmail);
  
  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const existing = shares.find(
    (s: FamilyShare) => s.animalId === animalId && s.sharedWithEmail.toLowerCase() === targetEmail.toLowerCase()
  );

  if (existing) {
    if (existing.status === "rejected") {
      existing.status = "pending";
      existing.permission = permission;
      existing.sharedWithUserId = targetUser ? targetUser.id : null;
      existing.createdAt = new Date().toISOString();
      writeJsonFile<any>(filePath, { shares });
      return existing;
    }
    throw new Error("Ja existe uma partilha ou convite para este email");
  }

  const newShare: FamilyShare = {
    id: shares.length > 0 ? Math.max(...shares.map((s: FamilyShare) => s.id)) + 1 : 1,
    ownerId,
    animalId,
    sharedWithEmail: targetEmail.toLowerCase(),
    sharedWithUserId: targetUser ? targetUser.id : null,
    permission,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  shares.push(newShare);
  writeJsonFile<any>(filePath, { shares });
  return newShare;
}

export async function getPendingInvitations(userId: number): Promise<any[]> {
  const supabase = getSupabase();
  const { data: user, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (error || !user || !user.email) return [];

  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const pending = shares.filter(
    (s: FamilyShare) =>
      s.sharedWithEmail.toLowerCase() === user.email.toLowerCase() &&
      s.status === "pending"
  );

  const result: any[] = [];
  for (const s of pending) {
    if (!s.sharedWithUserId) {
      s.sharedWithUserId = userId;
      writeJsonFile<any>(filePath, { shares });
    }

    const { data: animal } = await supabase
      .from("animals")
      .select("name, species")
      .eq("id", s.animalId)
      .single();

    const { data: owner } = await supabase
      .from("users")
      .select("name")
      .eq("id", s.ownerId)
      .single();

    result.push({
      ...s,
      animalName: animal?.name || "Animal",
      animalSpecies: animal?.species || "dog",
      ownerName: owner?.name || "Outro tutor",
    });
  }

  return result;
}

export async function respondToInvitation(
  userId: number,
  invitationId: number,
  action: "accept" | "reject"
): Promise<boolean> {
  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const share = shares.find((s: FamilyShare) => s.id === invitationId);
  if (!share) throw new Error("Convite nao encontrado");

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user || share.sharedWithEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("Nao autorizado");
  }

  share.status = action === "accept" ? "accepted" : "rejected";
  share.sharedWithUserId = userId;
  writeJsonFile<any>(filePath, { shares });
  return true;
}

export async function getSharedAnimalsForUser(userId: number): Promise<any[]> {
  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user || !user.email) return [];

  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const activeShares = shares.filter(
    (s: FamilyShare) =>
      s.sharedWithEmail.toLowerCase() === user.email.toLowerCase() &&
      s.status === "accepted"
  );

  const result: any[] = [];
  for (const s of activeShares) {
    const { data: animal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", s.animalId)
      .single();

    if (animal) {
      result.push({
        ...animal,
        isShared: true,
        permission: s.permission,
      });
    }
  }

  return result;
}

export async function getAnimalShares(animalId: number): Promise<any[]> {
  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const animalShares = shares.filter((s: FamilyShare) => s.animalId === animalId);
  return animalShares;
}

export async function removeAnimalShare(ownerId: number, shareId: number): Promise<boolean> {
  const filePath = FAMILY_SHARES_FILE_PATH;
  const fileData: any = readJsonFile<any>(filePath);
  const shares: FamilyShare[] = fileData.shares || [];

  const idx = shares.findIndex((s: FamilyShare) => s.id === shareId && s.ownerId === ownerId);
  if (idx === -1) {
    throw new Error("Partilha nao encontrada ou nao autorizada");
  }

  shares.splice(idx, 1);
  writeJsonFile<any>(filePath, { shares });
  return true;
}



