// Shared types between client and server

export type EmotionalState =
  | "distress"
  | "attention"
  | "excitement"
  | "hunger"
  | "alert"
  | "relaxed";

export type ModelUsed = "yamnet" | "wav2vec2" | "gemini";

export interface ClassifyResult {
  state: EmotionalState;
  confidence: number;
  emoji: string;
  model_used: ModelUsed;
  cached: boolean;
}

export interface AnimalData {
  id: number;
  name: string;
  species: "dog" | "cat";
  breed: string | null;
  age: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface EventData {
  id: number;
  animalId: number | null;
  state: EmotionalState;
  confidence: number;
  emoji: string;
  modelUsed: string;
  cached: boolean;
  feedback: "correct" | "incorrect" | null;
  createdAt: Date;
}

export const STATE_LABELS: Record<EmotionalState, string> = {
  distress:   "Angústia",
  attention:  "Atenção",
  excitement: "Excitação",
  hunger:     "Fome",
  alert:      "Alerta",
  relaxed:    "Relaxado",
};

export const STATE_EMOJIS: Record<EmotionalState, string> = {
  distress:   "🔴",
  attention:  "🟡",
  excitement: "🟢",
  hunger:     "🟠",
  alert:      "🔵",
  relaxed:    "⚪",
};

export const STATE_COLORS: Record<EmotionalState, string> = {
  distress:   "#ef4444",
  attention:  "#eab308",
  excitement: "#10b981",
  hunger:     "#f97316",
  alert:      "#3b82f6",
  relaxed:    "#94a3b8",
};
