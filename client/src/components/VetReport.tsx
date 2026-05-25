import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Save } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATE_LABELS } from "../../../shared/types";

interface VetReportProps {
  report: {
    animal: {
      name: string;
      species: string;
      breed: string | null;
      age: number | null;
      ownerName: string;
      ownerNote: string;
    };
    periodDays: number;
    events: Array<{
      id: number;
      createdAt: string;
      state: string;
      confidence: number;
      emoji: string;
      durationSeconds: number;
      notes: string;
    }>;
    trend: Array<{
      date: string;
      confidence: number;
      state: string;
    }>;
  };
  clinicalNotes: string;
  onClinicalNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function VetReport({
  report,
  clinicalNotes,
  onClinicalNotesChange,
  onSaveNotes,
  savingNotes,
}: VetReportProps) {
  const csv = useMemo(() => {
    const header = ["data", "estado", "confianca", "duracao_segundos", "notas_do_tutor"];
    const rows = report.events.map((event) => [
      new Date(event.createdAt).toISOString(),
      event.state,
      event.confidence,
      event.durationSeconds,
      event.notes,
    ]);
    return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [report.events]);

  const exportCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `animalmind-vet-${report.animal.name}-${report.periodDays}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5 print:bg-white print:text-slate-950" id="vet-report">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #vet-report, #vet-report * { visibility: visible; }
          #vet-report {
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 24px;
            background: white;
            color: #020617;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
            Relatório clínico
          </p>
          <h2 className="text-xl font-bold text-foreground print:text-slate-950">
            {report.animal.name}
          </h2>
          <p className="text-xs text-muted-foreground print:text-slate-700">
            {report.animal.species === "dog" ? "Cão" : "Gato"} · {report.animal.breed || "Raça não definida"} ·{" "}
            {report.animal.age ?? "?"} anos · Tutor: {report.animal.ownerName}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button onClick={() => window.print()} className="bg-emerald-500 text-white hover:bg-emerald-600">
            <FileText size={16} />
            PDF
          </Button>
          <Button onClick={exportCsv} variant="outline" className="border-slate-700 text-slate-200">
            <Download size={16} />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 print:border-slate-300 print:bg-white">
          <h3 className="mb-3 text-sm font-semibold text-slate-200 print:text-slate-950">
            Evolução emocional
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 print:border-slate-300 print:bg-white">
          <h3 className="text-sm font-semibold text-slate-200 print:text-slate-950">Notas</h3>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-500">Tutor</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 print:text-slate-700">
                {report.animal.ownerNote || "Sem notas do tutor associadas à partilha."}
              </p>
            </div>
            <div className="no-print">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Notas clínicas</p>
              <textarea
                value={clinicalNotes}
                onChange={(event) => onClinicalNotesChange(event.target.value)}
                className="mt-1 min-h-32 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 outline-none focus:border-emerald-500"
                placeholder="Observações clínicas, recomendações, sinais a monitorizar..."
              />
              <Button
                onClick={onSaveNotes}
                disabled={savingNotes}
                className="mt-2 w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Save size={15} />
                {savingNotes ? "A guardar..." : "Guardar notas"}
              </Button>
            </div>
            <div className="hidden print:block">
              <p className="text-[11px] font-semibold uppercase text-slate-500">Notas clínicas</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                {clinicalNotes || "Sem notas clínicas registadas."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 print:border-slate-300">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 print:bg-slate-100 print:text-slate-700">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Confiança</th>
              <th className="px-3 py-2">Duração</th>
              <th className="px-3 py-2">Notas do dono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 print:divide-slate-200">
            {report.events.map((event) => (
              <tr key={event.id} className="bg-slate-950/60 print:bg-white">
                <td className="px-3 py-2 text-slate-300 print:text-slate-800">
                  {new Date(event.createdAt).toLocaleString("pt-PT")}
                </td>
                <td className="px-3 py-2 text-slate-100 print:text-slate-950">
                  {event.emoji} {STATE_LABELS[event.state as keyof typeof STATE_LABELS] ?? event.state}
                </td>
                <td className="px-3 py-2 text-emerald-400 print:text-slate-800">
                  {Math.round(event.confidence * 100)}%
                </td>
                <td className="px-3 py-2 text-slate-300 print:text-slate-800">{event.durationSeconds}s</td>
                <td className="px-3 py-2 text-slate-400 print:text-slate-700">{event.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
