import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STATE_LABELS, STATE_COLORS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

const STATES: EmotionalState[] = [
  "distress",
  "attention",
  "excitement",
  "hunger",
  "alert",
  "relaxed",
];

// ─── Animal Card ─────────────────────────────────────────────────────────────

function AnimalCard({
  animal,
  active,
  onSelect,
}: {
  animal: { id: number; name: string; species: string; breed: string | null; age: number | null; isActive: boolean };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex-shrink-0 w-36 rounded-2xl p-4 border transition-all duration-200 text-left",
        "active:scale-95",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="text-3xl mb-2">{animal.species === "dog" ? "🐕" : "🐈"}</div>
      <p className="font-semibold text-sm text-foreground truncate">{animal.name}</p>
      <p className="text-xs text-muted-foreground truncate">{animal.breed ?? "—"}</p>
      {animal.age !== null && (
        <p className="text-xs text-muted-foreground">{animal.age} anos</p>
      )}
      {active && (
        <Badge className="mt-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground">
          <Check size={10} className="mr-0.5" /> Activo
        </Badge>
      )}
    </button>
  );
}

// ─── Weekly Stats Mini Chart ──────────────────────────────────────────────────

function WeeklyChart({ animalId }: { animalId: number }) {
  const { data: events = [] } = trpc.animals.weeklyStats.useQuery({ animalId });

  const counts: Record<EmotionalState, number> = {
    distress: 0, attention: 0, excitement: 0,
    hunger: 0, alert: 0, relaxed: 0,
  };
  for (const e of events) {
    if (e.state in counts) counts[e.state as EmotionalState]++;
  }

  const chartData = STATES.map((s) => ({
    state: STATE_LABELS[s],
    value: counts[s],
    fullMark: Math.max(...Object.values(counts), 1),
  }));

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Sem dados esta semana
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="oklch(0.22 0.012 264)" />
        <PolarAngleAxis
          dataKey="state"
          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 10 }}
        />
        <Radar
          name="Estados"
          dataKey="value"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.25}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.12 0.012 264)",
            border: "1px solid oklch(0.22 0.012 264)",
            borderRadius: "8px",
            color: "oklch(0.97 0.003 264)",
            fontSize: 12,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Add Animal Form ──────────────────────────────────────────────────────────

function AddAnimalForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const utils = trpc.useUtils();

  const addMutation = trpc.animals.add.useMutation({
    onSuccess: () => {
      toast.success("Animal adicionado com sucesso!");
      utils.animals.list.invalidate();
      onClose();
    },
    onError: () => toast.error("Erro ao adicionar animal."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("O nome é obrigatório.");
    addMutation.mutate({
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      age: age ? parseInt(age) : undefined,
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter">
      <h3 className="font-semibold text-foreground">Adicionar Animal</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Species toggle */}
        <div className="flex gap-2">
          {(["dog", "cat"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecies(s)}
              className={cn(
                "flex-1 py-2 rounded-xl border text-sm font-medium transition-all duration-200",
                species === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {s === "dog" ? "🐕 Cão" : "🐈 Gato"}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Nome *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Bobi"
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="breed" className="text-xs text-muted-foreground">Raça</Label>
          <Input
            id="breed"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="Ex: Labrador"
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="age" className="text-xs text-muted-foreground">Idade (anos)</Label>
          <Input
            id="age"
            type="number"
            min={0}
            max={30}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Ex: 3"
            className="bg-secondary border-border"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            className="flex-1 bg-primary text-primary-foreground"
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [showForm, setShowForm] = useState(false);
  const [, setLocation] = useLocation();
  const { data: animals = [] } = trpc.animals.list.useQuery();
  const utils = trpc.useUtils();

  const setActiveMutation = trpc.animals.setActive.useMutation({
    onSuccess: () => {
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
    },
  });

  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Perfil do Animal</h1>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus size={16} />
          Adicionar
        </Button>
      </div>

      {/* Add form */}
      {showForm && <AddAnimalForm onClose={() => setShowForm(false)} />}

      {/* Animal cards scroll */}
      {animals.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Seleccionar animal
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {animals.map((animal) => (
              <AnimalCard
                key={animal.id}
                animal={animal}
                active={animal.isActive}
                onSelect={() => setLocation(`/animal/${animal.id}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <span className="text-5xl">🐾</span>
          <p className="text-muted-foreground text-sm">
            Ainda não tem animais registados.
          </p>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground"
          >
            Adicionar primeiro animal
          </Button>
        </div>
      )}

      {/* Weekly stats chart */}
      {activeAnimal && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Distribuição semanal — {activeAnimal.name}
          </h2>
          <WeeklyChart animalId={activeAnimal.id} />
        </div>
      )}

      {/* Active animal details */}
      {activeAnimal && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">
                {activeAnimal.species === "dog" ? "🐕" : "🐈"}
              </span>
              <div>
                <p className="font-bold text-foreground">{activeAnimal.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeAnimal.breed ?? "Raça desconhecida"}
                  {activeAnimal.age !== null && ` · ${activeAnimal.age} anos`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/animal/${activeAnimal.id}`)}
              className="gap-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary text-xs"
            >
              Ver Detalhes
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Espécie</p>
              <p className="font-semibold text-sm">
                {activeAnimal.species === "dog" ? "Cão" : "Gato"}
              </p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Idade</p>
              <p className="font-semibold text-sm">
                {activeAnimal.age !== null ? `${activeAnimal.age} anos` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
