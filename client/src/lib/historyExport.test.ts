import { describe, expect, it } from "vitest";
import {
  buildHistoryCsv,
  getAnimalScopeLabel,
  getPeriodLabel,
  type HistoryExportEvent,
} from "./historyExport";

const event: HistoryExportEvent = {
  id: 1,
  userId: 10,
  animalId: 2,
  animalName: "Mimi",
  state: "relaxed",
  confidence: 0.91,
  emoji: "⚪",
  modelUsed: "yamnet",
  cached: false,
  feedback: "correct",
  audioUrl: "https://animalmind.supabase.co/audio.wav",
  createdAt: "2026-05-20T10:00:00.000Z",
};

describe("history export helpers", () => {
  it("builds CSV with all classification_events fields plus animal name", () => {
    const csv = buildHistoryCsv([event]);

    expect(csv.split("\n")[0]).toBe(
      "id,user_id,animal_id,animal_name,state,confidence,emoji,model_used,cached,feedback,audio_url,created_at",
    );
    expect(csv).toContain("https://animalmind.supabase.co/audio.wav");
    expect(csv).toContain("yamnet");
  });

  it("escapes CSV values that contain commas or quotes", () => {
    const csv = buildHistoryCsv([{ ...event, animalName: 'Mimi, "Persa"' }]);

    expect(csv).toContain('"Mimi, ""Persa"""');
  });

  it("describes animal and period labels for PDF headers", () => {
    expect(getAnimalScopeLabel([event])).toBe("Mimi");
    expect(getAnimalScopeLabel([event, { ...event, id: 2, animalName: "Bobi" }])).toBe(
      "Todos os animais",
    );
    expect(getPeriodLabel("2026-05-01", "2026-05-25")).toBe(
      "2026-05-01 a 2026-05-25",
    );
  });
});
