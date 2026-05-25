export interface HistoryExportEvent {
  id: number;
  userId: number | null;
  animalId: number | null;
  animalName: string;
  state: string;
  confidence: number;
  emoji: string;
  modelUsed: string;
  cached: boolean;
  feedback: string | null;
  audioUrl: string;
  createdAt: string;
}

const CSV_COLUMNS: Array<[string, (event: HistoryExportEvent) => unknown]> = [
  ["id", (event) => event.id],
  ["user_id", (event) => event.userId ?? ""],
  ["animal_id", (event) => event.animalId ?? ""],
  ["animal_name", (event) => event.animalName],
  ["state", (event) => event.state],
  ["confidence", (event) => event.confidence],
  ["emoji", (event) => event.emoji],
  ["model_used", (event) => event.modelUsed],
  ["cached", (event) => event.cached],
  ["feedback", (event) => event.feedback ?? ""],
  ["audio_url", (event) => event.audioUrl],
  ["created_at", (event) => event.createdAt],
];

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildHistoryCsv(events: HistoryExportEvent[]): string {
  const header = CSV_COLUMNS.map(([name]) => name).join(",");
  const rows = events.map((event) =>
    CSV_COLUMNS.map(([, getter]) => escapeCsvValue(getter(event))).join(","),
  );
  return [header, ...rows].join("\n");
}

export function getAnimalScopeLabel(events: HistoryExportEvent[]): string {
  const names = Array.from(
    new Set(events.map((event) => event.animalName).filter(Boolean)),
  );
  if (names.length === 1) return names[0];
  return "Todos os animais";
}

export function getPeriodLabel(dateFrom?: string, dateTo?: string): string {
  if (dateFrom && dateTo) return `${dateFrom} a ${dateTo}`;
  if (dateFrom) return `Desde ${dateFrom}`;
  if (dateTo) return `Até ${dateTo}`;
  return "Todos os períodos";
}

export function downloadTextFile(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
