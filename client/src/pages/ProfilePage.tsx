import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Check, Camera, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { motion } from "framer-motion";
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
  index,
}: {
  animal: { id: number; name: string; species: string; breed: string | null; age: number | null; isActive: boolean };
  active: boolean;
  onSelect: () => void;
  index: number;
}) {
  const { t } = useLanguage();
  return (
    <motion.button
      onClick={onSelect}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
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
        <p className="text-xs text-muted-foreground">
          {animal.age} {animal.age === 1 ? t("profilePage.year") : t("profilePage.years")}
        </p>
      )}
      {active && (
        <Badge className="mt-2 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground">
          <Check size={10} className="mr-0.5" /> {t("profilePage.active")}
        </Badge>
      )}
    </motion.button>
  );
}

// ─── Weekly Stats Mini Chart ──────────────────────────────────────────────────

function WeeklyChart({ animalId }: { animalId: number }) {
  const { t } = useLanguage();
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
        {t("dashboardPage.noRecords")}
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
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [age, setAge] = useState("");
  const [identifyLoading, setIdentifyLoading] = useState(false);
  const [breedSuggestions, setBreedSuggestions] = useState<Array<{ breed: string; confidence: number }>>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const [nameBlurred, setNameBlurred] = useState(false);
  const [specialMarkingsBlurred, setSpecialMarkingsBlurred] = useState(false);
  const [specialMarkings, setSpecialMarkings] = useState("");

  // Validation logic (after all state declarations)
  const isNameValid = name.trim().length > 0 && name.length <= 50;
  const isSpecialMarkingsValid = specialMarkings.length <= 500;
  const isFormValid = isNameValid && isSpecialMarkingsValid;

  const nameError = nameBlurred && !isNameValid
    ? (name.length > 50
      ? "O nome do animal excede o limite permitido. O nome deve ter no máximo 50 caracteres. Por favor, abrevie ou use um nome mais curto."
      : "O nome do animal está em branco. É necessário atribuir um nome para identificar o perfil do animal. Por favor, introduza o nome no campo.")
    : "";

  const specialMarkingsError = specialMarkingsBlurred && !isSpecialMarkingsValid
    ? "O texto de sinais particulares excede o limite. Os sinais particulares devem ter no máximo 500 caracteres. Reduza o texto antes de guardar."
    : "";

  const [predictionInfo, setPredictionInfo] = useState<{
    predictedBreed: string;
    confidence: number;
    animalType: "dog" | "cat";
  } | null>(null);

  const saveBreedFeedbackMutation = trpc.animals.saveBreedFeedback.useMutation({
    onError: (err) => console.error("Error saving breed feedback:", err),
  });

  // Breeds dropdown states
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState("");
  const [customBreed, setCustomBreed] = useState("");

  // New identification fields states
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "unknown">("unknown");
  const [color, setColor] = useState("");
  const [coat, setCoat] = useState<"short" | "medium" | "long" | "">("");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [height, setHeight] = useState("");
  const [tail, setTail] = useState<"long" | "short" | "docked" | "tailless" | "">("");



  // Helper to handle selecting a breed
  const handleSelectBreedHelper = (breedName: string, breedList: string[]) => {
    const isKnown = breedList.some((b) => b.toLowerCase() === breedName.toLowerCase());
    if (isKnown) {
      const matched = breedList.find((b) => b.toLowerCase() === breedName.toLowerCase());
      setSelectedBreed(matched || breedName);
      setCustomBreed("");
    } else {
      setSelectedBreed("other");
      setCustomBreed(breedName);
    }
  };

  // Fetch breeds on species change
  useEffect(() => {
    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      const cacheKey = `animalmind_breeds_${species}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const list = JSON.parse(cached) as string[];
          setBreeds(list);
          setLoadingBreeds(false);
          return;
        } catch {}
      }

      const url = species === "dog"
        ? "https://api.thedogapi.com/v1/breeds"
        : "https://api.thecatapi.com/v1/breeds";

      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as Array<{ name: string }>;
          const list = data.map((b) => b.name).sort();
          localStorage.setItem(cacheKey, JSON.stringify(list));
          setBreeds(list);
        } else {
          setBreeds([]);
        }
      } catch (err) {
        console.error("Error fetching breeds:", err);
        setBreeds([]);
      } finally {
        setLoadingBreeds(false);
      }
    };
    fetchBreeds();
  }, [species]);

  const addMutation = trpc.animals.add.useMutation({
    onSuccess: () => {
      toast.success(t("profilePage.saveSuccess"));
      if (predictionInfo) {
        const finalBreed = selectedBreed === "other" ? customBreed : selectedBreed;
        saveBreedFeedbackMutation.mutate({
          animalType: predictionInfo.animalType,
          predictedBreed: predictionInfo.predictedBreed,
          confirmedBreed: finalBreed.trim(),
          confidence: predictionInfo.confidence,
        });
      }
      utils.animals.list.invalidate();
      onClose();
    },
    onError: () => toast.error(t("profilePage.saveError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t("profilePage.saveError")); // Or a generic validation toast
    const finalBreed = selectedBreed === "other" ? customBreed : selectedBreed;
    addMutation.mutate({
      name: name.trim(),
      species,
      breed: finalBreed.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      sex,
      color: color.trim() || undefined,
      coat: coat || undefined,
      microchipNumber: microchipNumber.trim() || undefined,
      height: height.trim() || undefined,
      tail: tail || undefined,
      specialMarkings: specialMarkings.trim() || undefined,
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview da imagem
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIdentifyLoading(true);
    setBreedSuggestions([]);

    try {
      const fastapiUrl =
        (import.meta.env.VITE_FASTAPI_URL as string | undefined) ||
        "https://animalmind-production.up.railway.app";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("animal_type", species);

      const res = await fetch(`${fastapiUrl}/identify-breed`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Erro ao identificar raça");
      }

      const data = await res.json() as {
        breed: string;
        confidence: number;
        species: string;
        top3: Array<{ breed: string; confidence: number }>;
      };

      // Preencher automaticamente
      const targetSpecies = data.species === "cat" ? "cat" : "dog";
      setSpecies(targetSpecies);

      // Check if breed is in target species list (from cache or state)
      const cacheKey = `animalmind_breeds_${targetSpecies}`;
      const cached = localStorage.getItem(cacheKey);
      let listToCheck = breeds;
      if (cached) {
        try {
          listToCheck = JSON.parse(cached) as string[];
        } catch {}
      }

      handleSelectBreedHelper(data.breed, listToCheck);
      setBreedSuggestions(data.top3 ?? []);
      setPredictionInfo({
        predictedBreed: data.breed,
        confidence: data.confidence,
        animalType: targetSpecies,
      });

      toast.success(
        `📷 Raça identificada: ${data.breed} (${Math.round(data.confidence * 100)}% confiança)`
      );
    } catch (err: any) {
      console.error("[identify-breed]", err);
      toast.error(`Não foi possível identificar a raça: ${err.message ?? "erro desconhecido"}`);
    } finally {
      setIdentifyLoading(false);
      // Reset input para permitir re-selecionar a mesma imagem
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter">
      <h3 className="font-semibold text-foreground">{t("profilePage.addAnimal")}</h3>
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
              {s === "dog" ? `🐕 ${t("profilePage.speciesDog")}` : `🐈 ${t("profilePage.speciesCat")}`}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label htmlFor="name" className="text-xs text-muted-foreground">{t("profilePage.name")} *</Label>
            <div className="flex items-center gap-2">
              {isNameValid && (
                <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                  <Check size={10} /> ✓
                </span>
              )}
              <span className={`text-[10px] ${name.length > 45 ? "text-red-500 font-semibold animate-pulse" : "text-muted-foreground"}`}>
                {name.length}/50
              </span>
            </div>
          </div>
          <div className="relative">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameBlurred(true)}
              placeholder="Ex: Bobi"
              maxLength={60}
              className={`bg-secondary border-border ${
                nameError ? "border-red-500 focus-visible:ring-red-500/50" : ""
              } ${isNameValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
            />
          </div>
          {nameError && (
            <p className="text-[10px] text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{nameError}</span>
            </p>
          )}
        </div>

        {/* Breed select with photo ID button */}
        <div className="space-y-1">
          <Label htmlFor="breed" className="text-xs text-muted-foreground">{t("profilePage.breed")}</Label>
          <div className="flex gap-2">
            <select
              id="breed"
              value={selectedBreed}
              onChange={(e) => {
                setSelectedBreed(e.target.value);
                if (e.target.value !== "other") {
                  setCustomBreed("");
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border flex-1"
            >
              <option value="">{t("profilePage.breedPlaceholder")}</option>
              {breeds.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value="other">{t("profilePage.breedPlaceholder") === "Indefinida / Desconhecida" ? "Outra (digitar...)" : "Other (type...)"}</option>
            </select>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={identifyLoading}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 px-3"
              title={t("profilePage.identifyBreed")}
            >
              {identifyLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <span className="hidden sm:inline text-xs">
                {identifyLoading ? t("common.loading") : `📷 ${t("profilePage.identifyBreed")}`}
              </span>
            </Button>
          </div>

          {/* If Outra is selected, show custom breed input */}
          {selectedBreed === "other" && (
            <Input
              value={customBreed}
              onChange={(e) => setCustomBreed(e.target.value)}
              placeholder={t("profilePage.breed")}
              className="bg-secondary border-border mt-1.5"
            />
          )}

          {/* Photo preview thumbnail */}
          {photoPreview && (
            <div className="flex items-center gap-2 mt-1.5">
              <img
                src={photoPreview}
                alt="Pré-visualização"
                className="w-12 h-12 rounded-lg object-cover border border-border"
              />
              {identifyLoading && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  {t("profilePage.identifyBreedDesc")}
                </p>
              )}
            </div>
          )}

          {/* Top-3 breed suggestions */}
          {breedSuggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                {t("profilePage.identifyBreedDesc") === "A identificar..." ? "Sugestões (clique para selecionar)" : "Suggestions (click to select)"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {breedSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      handleSelectBreedHelper(s.breed, breeds);
                      setBreedSuggestions([]);
                    }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-all",
                      (selectedBreed === "other" ? customBreed : selectedBreed) === s.breed
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {s.breed}
                    <span className="ml-1 opacity-60">
                      {Math.round(s.confidence * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="age" className="text-xs text-muted-foreground">{t("profilePage.age")}</Label>
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
          <div className="space-y-1">
            <Label htmlFor="color" className="text-xs text-muted-foreground">{t("profilePage.color")}</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Ex: Castanho"
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dateOfBirth" className="text-xs text-muted-foreground">{t("profilePage.dateOfBirth")}</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("profilePage.sex")}</Label>
          <div className="flex gap-2">
            {([
              { value: "male", label: `♂️ ${t("profilePage.sexMale")}` },
              { value: "female", label: `♀️ ${t("profilePage.sexFemale")}` },
              { value: "unknown", label: `❓ ${t("profilePage.sexUnknown")}` }
            ] as const).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSex(s.value)}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-sm font-medium transition-all duration-200",
                  sex === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("profilePage.coat")}</Label>
          <div className="flex gap-2">
            {([
              { value: "short", label: t("profilePage.coatShort") },
              { value: "medium", label: t("profilePage.coatMedium") },
              { value: "long", label: t("profilePage.coatLong") }
            ] as const).map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCoat(coat === c.value ? "" : c.value)}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-sm font-medium transition-all duration-200",
                  coat === c.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="microchipNumber" className="text-xs text-muted-foreground">{t("profilePage.microchip")}</Label>
          <Input
            id="microchipNumber"
            value={microchipNumber}
            onChange={(e) => setMicrochipNumber(e.target.value.slice(0, 15))}
            placeholder="Ex: 900115000678234"
            className="bg-secondary border-border"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="height" className="text-xs text-muted-foreground">{t("profilePage.height")}</Label>
            <Input
              id="height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Ex: 45"
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tail" className="text-xs text-muted-foreground">{t("profilePage.tail")}</Label>
            <select
              id="tail"
              value={tail}
              onChange={(e) => setTail(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border text-foreground"
            >
              <option value="">{t("profilePage.tail")}</option>
              <option value="long">{t("profilePage.tailLong")}</option>
              <option value="short">{t("profilePage.tailShort")}</option>
              <option value="docked">{t("profilePage.tailDocked")}</option>
              <option value="tailless">{t("profilePage.tailTailless")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label htmlFor="specialMarkings" className="text-xs text-muted-foreground">{t("profilePage.specialMarkings")}</Label>
            <span className={`text-[10px] ${specialMarkings.length > 450 ? "text-red-500 font-semibold animate-pulse" : "text-muted-foreground"}`}>
              {specialMarkings.length}/500
            </span>
          </div>
          <textarea
            id="specialMarkings"
            value={specialMarkings}
            onChange={(e) => setSpecialMarkings(e.target.value)}
            onBlur={() => setSpecialMarkingsBlurred(true)}
            placeholder="Sinais particulares, cicatrizes, manchas..."
            maxLength={600}
            className={`w-full text-sm p-3 rounded-md bg-secondary border text-foreground min-h-[60px] focus:outline-none ${
              specialMarkingsError ? "border-red-500 focus:border-red-500" : "border-border"
            }`}
          />
          {specialMarkingsError && (
            <p className="text-[10px] text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{specialMarkingsError}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={addMutation.isPending || !isFormValid}
            className={`flex-1 font-semibold transition-all ${
              isFormValid
                ? "bg-primary text-primary-foreground hover:bg-emerald-600 shadow-md shadow-primary/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border-border"
            }`}
          >
            {addMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}


// ─── Profile Page ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [, setLocation] = useLocation();
  const { data: animals = [], isLoading, error, refetch } = trpc.animals.list.useQuery();
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
        <h1 className="text-xl font-bold text-foreground">{t("profilePage.title")}</h1>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus size={16} />
          {t("common.add")}
        </Button>
      </div>

      {/* Add form */}
      {showForm && <AddAnimalForm onClose={() => setShowForm(false)} />}

      {/* Animal cards list - 4 States */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 bg-slate-800" />
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="flex-shrink-0 w-36 h-28 rounded-2xl bg-slate-800" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm text-foreground font-semibold">Não foi possível carregar a lista de animais.</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Ocorreu uma falha ao comunicar com o servidor da base de dados. Por favor, verifique a sua ligação à internet e prima o botão abaixo para tentar novamente.
          </p>
          <Button size="sm" onClick={() => refetch()} className="bg-primary text-primary-foreground rounded-xl">
            Tentar novamente
          </Button>
        </div>
      ) : animals.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            {t("profilePage.selectAnimal")}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {animals.map((animal, idx) => (
              <AnimalCard
                key={animal.id}
                animal={animal}
                active={animal.isActive}
                onSelect={() => setLocation(`/animal/${animal.id}`)}
                index={idx}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-secondary/10 border border-dashed border-border rounded-2xl p-6">
          <span className="text-5xl">🐾</span>
          <p className="text-muted-foreground text-sm font-medium">
            Ainda não tens animais. Adiciona o teu primeiro companheiro! 🐾
          </p>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground rounded-xl"
          >
            + Adicionar animal
          </Button>
        </div>
      )}

      {/* Weekly stats chart */}
      {activeAnimal && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("profilePage.weeklyDistribution")} — {activeAnimal.name}
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
                  {activeAnimal.breed ?? t("profilePage.unknownBreed")}
                  {activeAnimal.age !== null && ` · ${activeAnimal.age} ${activeAnimal.age === 1 ? t("profilePage.year") : t("profilePage.years")}`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(`/animal/${activeAnimal.id}`)}
              className="gap-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary text-xs"
            >
              {t("profilePage.viewDetails")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("profilePage.species")}</p>
              <p className="font-semibold text-sm">
                {activeAnimal.species === "dog" ? t("profilePage.speciesDog") : t("profilePage.speciesCat")}
              </p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("profilePage.age").split(" ")[0]}</p>
              <p className="font-semibold text-sm">
                {activeAnimal.age !== null ? `${activeAnimal.age} ${activeAnimal.age === 1 ? t("profilePage.year") : t("profilePage.years")}` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
