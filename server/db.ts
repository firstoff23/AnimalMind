import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import type { InsertUser } from "../drizzle/schema";
import fs from "fs";
import path from "path";

let _supabase: SupabaseClient<any> | null = null;

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
  return data || [];
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
  const supabase = getSupabase();

  // Deactivate all
  await supabase
    .from("animals")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Activate target
  const { error } = await supabase
    .from("animals")
    .update({ is_active: true })
    .eq("id", animalId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getActiveAnimal(userId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
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
  const audio = readAudioFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: audio[e.id] || null,
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
  const audio = readAudioFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: audio[e.id] || null,
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

export async function getAllEventsForExport(userId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("classification_events")
    .select("*, animals(name, species)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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

// ─── Event Audio operations (Local File Persistence & Supabase Storage) ──────

const AUDIO_FILE_PATH = path.resolve(import.meta.dirname, "audio.json");

function readAudioFromFile(): Record<number, string> {
  try {
    if (fs.existsSync(AUDIO_FILE_PATH)) {
      const content = fs.readFileSync(AUDIO_FILE_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Audio] Failed to read audio mapping:", error);
  }
  return {};
}

function writeAudioToFile(audio: Record<number, string>) {
  try {
    fs.writeFileSync(AUDIO_FILE_PATH, JSON.stringify(audio, null, 2), "utf8");
  } catch (error) {
    console.error("[Audio] Failed to write audio mapping:", error);
  }
}

export async function getEventAudio(eventId: number): Promise<string> {
  const audio = readAudioFromFile();
  return audio[eventId] || "";
}

export async function updateEventAudio(eventId: number, audioUrl: string): Promise<string> {
  const audio = readAudioFromFile();
  audio[eventId] = audioUrl;
  writeAudioToFile(audio);
  return audioUrl;
}

export async function uploadAudioToSupabase(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const supabase = getSupabase();
  const bucketName = "animal-audio";

  try {
    await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ["audio/webm", "audio/wav", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/x-m4a"],
    });
  } catch (err) {
    // Ignore bucket creation if already exists
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[Storage] Supabase upload failed:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// ─── Animal Baseline operations (Local File Persistence) ─────────────────────

export interface AnimalBaseline {
  vocalizationThreshold: number;
  normalStates: string[];
  alertSensitivity: "low" | "medium" | "high";
  updatedAt: string;
}

const BASELINES_FILE_PATH = path.resolve(import.meta.dirname, "baselines.json");

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

export async function getAnimalBaseline(animalId: number): Promise<AnimalBaseline> {
  const baselines = readBaselinesFromFile();
  const baseline = baselines[animalId];
  if (baseline) {
    return baseline;
  }
  
  // Return default baseline if not set yet
  return {
    vocalizationThreshold: 10,
    normalStates: ["relaxed", "excitement"],
    alertSensitivity: "medium",
    updatedAt: new Date().toISOString(),
  };
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
  const current = baselines[animalId] || {
    vocalizationThreshold: 10,
    normalStates: ["relaxed", "excitement"],
    alertSensitivity: "medium",
    updatedAt: new Date().toISOString(),
  };

  const updated: AnimalBaseline = {
    vocalizationThreshold: data.vocalizationThreshold ?? current.vocalizationThreshold,
    normalStates: data.normalStates ?? current.normalStates,
    alertSensitivity: data.alertSensitivity ?? current.alertSensitivity,
    updatedAt: new Date().toISOString(),
  };

  baselines[animalId] = updated;
  writeBaselinesToFile(baselines);
  return updated;
}

export async function verifyAnimalOwner(animalId: number, userId: number): Promise<void> {
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

  if (Number(data.user_id) !== userId) {
    throw new Error("Não autorizado");
  }
}

export async function getAnimalById(animalId: number, userId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("id", animalId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
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
  const audio = readAudioFromFile();
  const events = (data || []).map((e: any) => ({
    ...e,
    notes: notes[e.id] || null,
    audioUrl: audio[e.id] || null,
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


