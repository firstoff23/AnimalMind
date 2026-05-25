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

  if (error) {
    console.error("[addAnimal] Database insert error:", error);
    throw error;
  }
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
  const eventPayload: Record<string, unknown> = {
    user_id: data.userId,
    animal_id: data.animalId,
    state: data.state,
    confidence: data.confidence,
    emoji: data.emoji,
    model_used: data.modelUsed,
    cached: data.cached ?? false,
  };

  if (data.audioUrl !== undefined) {
    eventPayload.audio_url = data.audioUrl;
  }

  const { data: result, error } = await supabase
    .from("classification_events")
    .insert([eventPayload])
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
  dateTo?: string,
  animalId?: number
) {
  const supabase = getSupabase();
  let query = supabase
    .from("classification_events")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (animalId) query = query.eq("animal_id", animalId);
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
    animalId?: number;
  } = {}
) {
  const supabase = getSupabase();
  let query = supabase
    .from("classification_events")
    .select("*, animals(name, species)")
    .eq("user_id", userId);

  if (filters.animalId) query = query.eq("animal_id", filters.animalId);
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
    const hasFamilyAccess = await userHasFamilyAnimalAccess(userId, animalId);
    if (!hasFamilyAccess) {
      throw new Error("Não autorizado");
    }
    return;
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

  const dayStats: Record<string, { count: number; sumConfidence: number; [key: string]: any }> = {};
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
    dayStats[dateStr][event.state] = (dayStats[dateStr][event.state] || 0) + 1;

    stateCounts[event.state] = (stateCounts[event.state] || 0) + 1;
  }

  const sortedActivity = Object.entries(dayStats)
    .map(([date, val]) => {
      const stateBreakdown: Record<string, number> = {};
      Object.entries(val).forEach(([k, v]) => {
        if (k !== "count" && k !== "sumConfidence") {
          stateBreakdown[k] = v;
        }
      });
      return {
        date,
        count: val.count,
        avgConfidence: val.count > 0 ? Math.round((val.sumConfidence / val.count) * 100) / 100 : 0,
        ...stateBreakdown,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const dailyActivity = sortedActivity.slice(-days);

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
const VET_CLINICAL_NOTES_FILE_PATH = path.resolve(import.meta.dirname, "vet_clinical_notes.json");
const FAMILIES_FILE_PATH = path.resolve(import.meta.dirname, "families.json");

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
  data: { name: string; email: string; note: string; ownerId?: number }
): Promise<boolean> {
  try {
    if (data.ownerId) {
      const supabase = getSupabase();
      await supabase
        .from("vet_shares")
        .upsert(
          [
            {
              animal_id: animalId,
              owner_id: data.ownerId,
              vet_email: data.email.toLowerCase(),
              vet_name: data.name,
              owner_note: data.note,
              shared_at: new Date().toISOString(),
            },
          ],
          { onConflict: "animal_id,vet_email" }
        );
    }
  } catch (error) {
    console.warn("[Vet] Falling back to local vet share persistence:", error);
  }

  const shares = readJsonFile<any>(VET_SHARES_FILE_PATH);
  const animalShares = shares[animalId] || [];
  
  animalShares.push({
    ...data,
    email: data.email.toLowerCase(),
    sharedAt: new Date().toISOString()
  });

  shares[animalId] = animalShares;
  writeJsonFile<any>(VET_SHARES_FILE_PATH, shares);
  return true;
}

export interface VetAnimalFilters {
  species?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface VetSharedAnimal {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  ownerId: number | null;
  ownerName: string;
  ownerEmail: string | null;
  sharedAt: string;
  ownerNote: string;
  lastState: string | null;
  lastConfidence: number | null;
  lastEventAt: string | null;
}

function getVetClinicalNotesKey(vetUserId: number, animalId: number) {
  return `${vetUserId}:${animalId}`;
}

async function getUserEmail(userId: number): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data?.email ?? null;
  } catch {
    return null;
  }
}

async function getAnimalOwnerSummary(ownerId: number | null) {
  if (!ownerId) return { ownerName: "Tutor", ownerEmail: null };
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", ownerId)
      .single();
    return {
      ownerName: data?.name || "Tutor",
      ownerEmail: data?.email ?? null,
    };
  } catch {
    return { ownerName: "Tutor", ownerEmail: null };
  }
}

async function getLatestEventSummaryForAnimal(animalId: number) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("classification_events")
      .select("state, confidence, created_at")
      .eq("animal_id", animalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      lastState: data?.state ?? null,
      lastConfidence: data?.confidence !== undefined ? Number(data.confidence) : null,
      lastEventAt: data?.created_at ?? null,
    };
  } catch {
    return { lastState: null, lastConfidence: null, lastEventAt: null };
  }
}

function filterVetAnimals(animals: VetSharedAnimal[], filters: VetAnimalFilters = {}) {
  return animals.filter((animal) => {
    if (filters.species && filters.species !== "all" && animal.species !== filters.species) {
      return false;
    }
    if (filters.state && filters.state !== "all" && animal.lastState !== filters.state) {
      return false;
    }
    if (filters.dateFrom && animal.lastEventAt && animal.lastEventAt < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && animal.lastEventAt && animal.lastEventAt > filters.dateTo) {
      return false;
    }
    return true;
  });
}

export async function getVetSharedAnimals(
  vetUserId: number,
  vetEmail: string | null,
  filters: VetAnimalFilters = {}
): Promise<VetSharedAnimal[]> {
  const normalizedEmail = vetEmail?.toLowerCase() ?? null;
  const supabase = getSupabase();

  try {
    let query = supabase
      .from("vet_shares")
      .select("*")
      .order("shared_at", { ascending: false });

    if (normalizedEmail) {
      query = query.or(`vet_user_id.eq.${vetUserId},vet_email.eq.${normalizedEmail}`);
    } else {
      query = query.eq("vet_user_id", vetUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if ((!data || data.length === 0) && fs.existsSync(VET_SHARES_FILE_PATH)) {
      throw new Error("No database shares, falling back to local files");
    }

    const result: VetSharedAnimal[] = [];
    for (const share of data || []) {
      const { data: animal } = await supabase
        .from("animals")
        .select("*")
        .eq("id", share.animal_id)
        .single();
      if (!animal) continue;

      const owner = await getAnimalOwnerSummary(Number(share.owner_id));
      const latest = await getLatestEventSummaryForAnimal(Number(share.animal_id));
      result.push({
        id: Number(animal.id),
        name: animal.name,
        species: animal.species,
        breed: animal.breed ?? null,
        age: animal.age ?? null,
        ownerId: Number(share.owner_id),
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        sharedAt: share.shared_at,
        ownerNote: share.owner_note ?? "",
        ...latest,
      });
    }

    return filterVetAnimals(result, filters);
  } catch (error) {
    console.warn("[Vet] Falling back to local vet shares:", error);
  }

  const shares = readJsonFile<any>(VET_SHARES_FILE_PATH);
  const result: VetSharedAnimal[] = [];

  for (const [animalIdText, animalShares] of Object.entries(shares)) {
    const matchingShares = Array.isArray(animalShares)
      ? animalShares.filter((share) => {
          if (!normalizedEmail) return share.ownerId === vetUserId || share.vetUserId === vetUserId;
          return String(share.email || "").toLowerCase() === normalizedEmail;
        })
      : [];

    for (const share of matchingShares) {
      const animalId = Number(animalIdText);
      const { data: animal } = await supabase
        .from("animals")
        .select("*")
        .eq("id", animalId)
        .single();
      if (!animal) continue;

      const ownerId = share.ownerId ? Number(share.ownerId) : Number(animal.user_id ?? 0) || null;
      const owner = await getAnimalOwnerSummary(ownerId);
      const latest = await getLatestEventSummaryForAnimal(animalId);
      result.push({
        id: animalId,
        name: animal.name,
        species: animal.species,
        breed: animal.breed ?? null,
        age: animal.age ?? null,
        ownerId,
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        sharedAt: share.sharedAt ?? new Date().toISOString(),
        ownerNote: share.note ?? "",
        ...latest,
      });
    }
  }

  return filterVetAnimals(result, filters);
}

export async function getVetReportData(
  vetUserId: number,
  vetEmail: string | null,
  animalId: number,
  days: number
) {
  const sharedAnimals = await getVetSharedAnimals(vetUserId, vetEmail);
  const animal = sharedAnimals.find((item) => item.id === animalId);
  if (!animal) {
    throw new Error("Animal não partilhado com este veterinário");
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const supabase = getSupabase();

  let events: any[] = [];
  try {
    const { data, error } = await supabase
      .from("classification_events")
      .select("*")
      .eq("animal_id", animalId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;
    events = data || [];
  } catch (error) {
    console.warn("[Vet] Could not load report events:", error);
  }

  const ownerNotes = readNotesFromFile();
  const clinicalNotes = await getVetClinicalNotes(vetUserId, animalId);
  const trend = [...events]
    .reverse()
    .map((event) => ({
      date: new Date(event.created_at).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
      }),
      confidence: Number(event.confidence),
      state: event.state,
    }));

  return {
    animal,
    periodDays: days,
    events: events.map((event) => ({
      id: Number(event.id),
      createdAt: event.created_at,
      state: event.state,
      confidence: Number(event.confidence),
      emoji: event.emoji ?? "",
      modelUsed: event.model_used ?? "",
      durationSeconds: 3,
      notes: ownerNotes[event.id] || "",
    })),
    trend,
    clinicalNotes,
    generatedAt: new Date().toISOString(),
  };
}

export async function getVetClinicalNotes(vetUserId: number, animalId: number): Promise<string> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("vet_clinical_notes")
      .select("notes")
      .eq("vet_user_id", vetUserId)
      .eq("animal_id", animalId)
      .maybeSingle();
    if (error) throw error;
    return data?.notes ?? "";
  } catch {
    const notes = readJsonFile<string>(VET_CLINICAL_NOTES_FILE_PATH);
    return notes[getVetClinicalNotesKey(vetUserId, animalId)] || "";
  }
}

export async function saveVetClinicalNotes(
  vetUserId: number,
  animalId: number,
  notes: string
): Promise<string> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("vet_clinical_notes")
      .upsert(
        [
          {
            vet_user_id: vetUserId,
            animal_id: animalId,
            notes,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "animal_id,vet_user_id" }
      );
    if (error) throw error;
  } catch (error) {
    console.warn("[Vet] Falling back to local clinical notes:", error);
    const localNotes = readJsonFile<string>(VET_CLINICAL_NOTES_FILE_PATH);
    localNotes[getVetClinicalNotesKey(vetUserId, animalId)] = notes;
    writeJsonFile<string>(VET_CLINICAL_NOTES_FILE_PATH, localNotes);
  }

  return notes;
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

export interface FamilyRecord {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
}

export interface FamilyMemberRecord {
  familyId: number;
  userId: number;
  role: "admin" | "member";
  joinedAt: string;
  name?: string | null;
  email?: string | null;
}

export interface FamilyInviteRecord {
  code: string;
  familyId: number;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

interface FamilyStore {
  families: FamilyRecord[];
  members: FamilyMemberRecord[];
  animals: { familyId: number; animalId: number; sharedAt: string }[];
  invites: FamilyInviteRecord[];
}

function readFamilyStore(): FamilyStore {
  const data = readJsonFile<any>(FAMILIES_FILE_PATH) as any;
  return {
    families: Array.isArray(data.families) ? data.families : [],
    members: Array.isArray(data.members) ? data.members : [],
    animals: Array.isArray(data.animals) ? data.animals : [],
    invites: Array.isArray(data.invites) ? data.invites : [],
  };
}

function writeFamilyStore(store: FamilyStore) {
  writeJsonFile<any>(FAMILIES_FILE_PATH, store as any);
}

function nextLocalId(items: { id: number }[]) {
  return items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function getUserSummary(userId: number) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();
    return {
      name: data?.name ?? "Membro",
      email: data?.email ?? null,
    };
  } catch {
    return { name: "Membro", email: null };
  }
}

async function getUserFamilyIds(userId: number): Promise<number[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId);
    if (error) throw error;
    return (data || []).map((row: any) => Number(row.family_id));
  } catch {
    const store = readFamilyStore();
    return store.members
      .filter((member) => member.userId === userId)
      .map((member) => member.familyId);
  }
}

export async function createFamilyGroup(userId: number, name: string): Promise<FamilyRecord> {
  try {
    const supabase = getSupabase();
    const { data: family, error } = await supabase
      .from("families")
      .insert([{ name, owner_id: userId }])
      .select()
      .single();
    if (error) throw error;

    await supabase.from("family_members").insert([
      {
        family_id: family.id,
        user_id: userId,
        role: "admin",
      },
    ]);

    return {
      id: Number(family.id),
      name: family.name,
      ownerId: Number(family.owner_id),
      createdAt: family.created_at,
    };
  } catch (error) {
    console.warn("[Family] Falling back to local family creation:", error);
  }

  const store = readFamilyStore();
  const family: FamilyRecord = {
    id: nextLocalId(store.families),
    name,
    ownerId: userId,
    createdAt: new Date().toISOString(),
  };
  store.families.push(family);
  store.members.push({
    familyId: family.id,
    userId,
    role: "admin",
    joinedAt: family.createdAt,
  });
  writeFamilyStore(store);
  return family;
}

export async function getFamilyMembersForUser(userId: number): Promise<FamilyMemberRecord[]> {
  try {
    const familyIds = await getUserFamilyIds(userId);
    if (familyIds.length === 0) return [];

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("family_members")
      .select("family_id, user_id, role, joined_at")
      .in("family_id", familyIds);
    if (error) throw error;

    const members: FamilyMemberRecord[] = [];
    for (const row of data || []) {
      const summary = await getUserSummary(Number(row.user_id));
      members.push({
        familyId: Number(row.family_id),
        userId: Number(row.user_id),
        role: row.role,
        joinedAt: row.joined_at,
        ...summary,
      });
    }
    return members;
  } catch {
    const store = readFamilyStore();
    const familyIds = store.members
      .filter((member) => member.userId === userId)
      .map((member) => member.familyId);

    const members = store.members.filter((member) => familyIds.includes(member.familyId));
    return Promise.all(
      members.map(async (member) => ({
        ...member,
        ...(await getUserSummary(member.userId)),
      }))
    );
  }
}

export async function createFamilyInviteForUser(
  userId: number,
  familyId?: number
): Promise<FamilyInviteRecord & { inviteUrl: string }> {
  const familyIds = await getUserFamilyIds(userId);
  const targetFamilyId = familyId ?? familyIds[0];
  if (!targetFamilyId || !familyIds.includes(targetFamilyId)) {
    throw new Error("Família não encontrada ou não autorizada");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  let code = generateInviteCode();

  try {
    const supabase = getSupabase();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from("invites")
        .insert([
          {
            code,
            family_id: targetFamilyId,
            expires_at: expiresAt.toISOString(),
            used: false,
          },
        ])
        .select()
        .single();
      if (!error && data) {
        return {
          code: data.code,
          familyId: Number(data.family_id),
          expiresAt: data.expires_at,
          used: Boolean(data.used),
          createdAt: data.created_at,
          inviteUrl: `https://animalmind.vercel.app/join/${data.code}`,
        };
      }
      code = generateInviteCode();
    }
  } catch (error) {
    console.warn("[Family] Falling back to local invite creation:", error);
  }

  const store = readFamilyStore();
  while (store.invites.some((invite) => invite.code === code)) {
    code = generateInviteCode();
  }
  const invite: FamilyInviteRecord = {
    code,
    familyId: targetFamilyId,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  };
  store.invites.push(invite);
  writeFamilyStore(store);
  return {
    ...invite,
    inviteUrl: `https://animalmind.vercel.app/join/${invite.code}`,
  };
}

export async function joinFamilyByInviteCode(userId: number, code: string): Promise<{ success: true; familyId: number }> {
  const normalizedCode = code.trim().toUpperCase();

  try {
    const supabase = getSupabase();
    const { data: invite, error } = await supabase
      .from("invites")
      .select("*")
      .eq("code", normalizedCode)
      .eq("used", false)
      .single();
    if (error) throw error;
    if (!invite || new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error("Convite expirado");
    }

    await supabase.from("family_members").upsert(
      [
        {
          family_id: invite.family_id,
          user_id: userId,
          role: "member",
        },
      ],
      { onConflict: "family_id,user_id" }
    );
    await supabase.from("invites").update({ used: true }).eq("code", normalizedCode);
    return { success: true, familyId: Number(invite.family_id) };
  } catch (error) {
    console.warn("[Family] Falling back to local invite join:", error);
  }

  const store = readFamilyStore();
  const invite = store.invites.find((item) => item.code === normalizedCode && !item.used);
  if (!invite) throw new Error("Convite não encontrado");
  if (new Date(invite.expiresAt).getTime() < Date.now()) throw new Error("Convite expirado");

  const existing = store.members.find(
    (member) => member.familyId === invite.familyId && member.userId === userId
  );
  if (!existing) {
    store.members.push({
      familyId: invite.familyId,
      userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
  }
  invite.used = true;
  writeFamilyStore(store);
  return { success: true, familyId: invite.familyId };
}

export async function shareAnimalWithFamily(
  userId: number,
  animalId: number,
  familyId?: number
): Promise<{ success: true; familyId: number; animalId: number }> {
  await verifyAnimalOwner(animalId, userId, true);
  const familyIds = await getUserFamilyIds(userId);
  const targetFamilyId = familyId ?? familyIds[0];
  if (!targetFamilyId || !familyIds.includes(targetFamilyId)) {
    throw new Error("Família não encontrada ou não autorizada");
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("family_animals")
      .upsert(
        [
          {
            family_id: targetFamilyId,
            animal_id: animalId,
          },
        ],
        { onConflict: "family_id,animal_id" }
      );
    if (error) throw error;
  } catch (error) {
    console.warn("[Family] Falling back to local family animal sharing:", error);
    const store = readFamilyStore();
    const exists = store.animals.some(
      (item) => item.familyId === targetFamilyId && item.animalId === animalId
    );
    if (!exists) {
      store.animals.push({
        familyId: targetFamilyId,
        animalId,
        sharedAt: new Date().toISOString(),
      });
      writeFamilyStore(store);
    }
  }

  return { success: true, familyId: targetFamilyId, animalId };
}

export async function getFamilyAnimalsForUser(userId: number): Promise<any[]> {
  const familyIds = await getUserFamilyIds(userId);
  if (familyIds.length === 0) return [];

  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from("family_animals")
      .select("family_id, animal_id, shared_at")
      .in("family_id", familyIds);
    if (error) throw error;

    const result: any[] = [];
    for (const row of rows || []) {
      const { data: animal } = await supabase
        .from("animals")
        .select("*")
        .eq("id", row.animal_id)
        .single();
      if (animal) {
        result.push({
          ...animal,
          familyId: Number(row.family_id),
          sharedAt: row.shared_at,
        });
      }
    }
    return result;
  } catch (error) {
    console.warn("[Family] Falling back to local family animals:", error);
  }

  const store = readFamilyStore();
  const localRows = store.animals.filter((row) => familyIds.includes(row.familyId));
  const supabase = getSupabase();
  const result: any[] = [];
  for (const row of localRows) {
    const { data: animal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", row.animalId)
      .single();
    if (animal) {
      result.push({
        ...animal,
        familyId: row.familyId,
        sharedAt: row.sharedAt,
      });
    }
  }
  return result;
}

export async function getFamilyActivityForUser(userId: number): Promise<any[]> {
  const animals = await getFamilyAnimalsForUser(userId);
  const animalIds = Array.from(new Set(animals.map((animal) => Number(animal.id))));
  if (animalIds.length === 0) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("classification_events")
      .select("id, user_id, animal_id, state, confidence, created_at")
      .in("animal_id", animalIds)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;

    const result = [];
    for (const event of data || []) {
      const animal = animals.find((item) => Number(item.id) === Number(event.animal_id));
      const user = await getUserSummary(Number(event.user_id));
      result.push({
        id: Number(event.id),
        userName: user.name,
        animalName: animal?.name || "Animal",
        state: event.state,
        confidence: Number(event.confidence),
        createdAt: event.created_at,
        message: `${user.name} classificou ${animal?.name || "Animal"} como ${event.state}`,
      });
    }
    return result;
  } catch (error) {
    console.warn("[Family] Could not load family activity:", error);
    return [];
  }
}

async function userHasFamilyAnimalAccess(userId: number, animalId: number): Promise<boolean> {
  const animals = await getFamilyAnimalsForUser(userId);
  return animals.some((animal) => Number(animal.id) === animalId);
}



