import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import VetReport from "@/components/VetReport";
import { Activity, Filter, Stethoscope } from "lucide-react";
import { toast } from "sonner";

const STATES = ["all", "distress", "attention", "excitement", "hunger", "alert", "relaxed"];

export default function VetDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [species, setSpecies] = useState("all");
  const [state, setState] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [clinicalNotes, setClinicalNotes] = useState("");

  const meQuery = trpc.auth.me.useQuery();
  const role =
    meQuery.data?.role ||
    (user?.app_metadata?.role as string | undefined);
  const isVet = role === "vet" || role === "admin";

  useEffect(() => {
    if (!meQuery.isLoading && !isVet) {
      setLocation("/dashboard");
    }
  }, [isVet, meQuery.isLoading, setLocation]);

  const animalsQuery = trpc.vet.getAnimals.useQuery(
    { species, state, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
    { enabled: isVet }
  );

  useEffect(() => {
    if (animalsQuery.error) {
      toast.error("Acesso veterinário não autorizado.");
      setLocation("/dashboard");
    }
  }, [animalsQuery.error, setLocation]);

  const selectedAnimal = useMemo(
    () => animalsQuery.data?.find((animal) => animal.id === selectedAnimalId) ?? animalsQuery.data?.[0],
    [animalsQuery.data, selectedAnimalId]
  );

  useEffect(() => {
    if (!selectedAnimalId && selectedAnimal) {
      setSelectedAnimalId(selectedAnimal.id);
    }
  }, [selectedAnimal, selectedAnimalId]);

  const reportQuery = trpc.vet.getReport.useQuery(
    { animalId: selectedAnimal?.id ?? 0, days: periodDays },
    { enabled: isVet && !!selectedAnimal?.id }
  );

  useEffect(() => {
    if (reportQuery.data) {
      setClinicalNotes(reportQuery.data.clinicalNotes);
    }
  }, [reportQuery.data]);

  const saveNotesMutation = trpc.vet.saveNotes.useMutation({
    onSuccess: () => toast.success("Notas clínicas guardadas."),
    onError: (error) => toast.error(error.message),
  });

  if (!isVet) {
    return null;
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
              <Stethoscope size={16} />
              Modo Veterinário
            </p>
            <h1 className="mt-2 text-3xl font-bold">Dashboard clínico</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Animais partilhados consigo, histórico clínico, notas veterinárias e relatórios exportáveis.
            </p>
          </div>
          <Button onClick={() => setLocation("/dashboard")} variant="outline" className="border-slate-700">
            Voltar ao dashboard
          </Button>
        </header>

        <section className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-4">
          <label className="space-y-1 text-xs text-slate-400">
            Espécie
            <select
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            >
              <option value="all">Todas</option>
              <option value="dog">Cães</option>
              <option value="cat">Gatos</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Estado emocional
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            >
              {STATES.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Todos" : item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Até
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            />
          </label>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Filter size={16} className="text-emerald-400" />
              Animais partilhados
            </div>
            {animalsQuery.isLoading ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                A carregar animais...
              </div>
            ) : animalsQuery.data?.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Ainda não existem animais partilhados com este veterinário.
              </div>
            ) : (
              animalsQuery.data?.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimalId(animal.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedAnimal?.id === animal.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-100">{animal.name}</p>
                      <p className="text-xs text-slate-400">
                        {animal.species === "dog" ? "Cão" : "Gato"} · Tutor: {animal.ownerName}
                      </p>
                    </div>
                    <Activity size={18} className="text-emerald-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Último estado: {animal.lastState || "sem registos"}
                  </p>
                </button>
              ))
            )}
          </aside>

          <main className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Período do relatório
              </p>
              <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setPeriodDays(days)}
                    className={`rounded-md px-3 py-1 text-xs ${
                      periodDays === days ? "bg-emerald-500 text-white" : "text-slate-400"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {reportQuery.data ? (
              <VetReport
                report={reportQuery.data}
                clinicalNotes={clinicalNotes}
                onClinicalNotesChange={setClinicalNotes}
                savingNotes={saveNotesMutation.isPending}
                onSaveNotes={() =>
                  selectedAnimal &&
                  saveNotesMutation.mutate({
                    animalId: selectedAnimal.id,
                    notes: clinicalNotes,
                  })
                }
              />
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                Selecione um animal partilhado para gerar o relatório clínico.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
