import { motion } from "framer-motion";
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  PawPrint,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { useLocation } from "wouter";
import { validateUploadedFile } from "@/lib/fileValidation";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_LABELS } from "../../../shared/types";

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
  animal: {
    id: number;
    name: string;
    species: string;
    breed: string | null;
    age: number | null;
    isActive: boolean;
  };
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
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "flex-shrink-0 w-36 rounded-2xl p-4 border transition-all duration-200 text-left",
        "active:scale-95",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
        <PawPrint size={20} className="text-primary" />
      </div>
      <p className="font-semibold text-sm text-foreground truncate">
        {animal.name}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {animal.breed ?? "—"}
      </p>
      {animal.age !== null && (
        <p className="text-xs text-muted-foreground">
          {animal.age}{" "}
          {animal.age === 1 ? t("profilePage.year") : t("profilePage.years")}
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
    distress: 0,
    attention: 0,
    excitement: 0,
    hunger: 0,
    alert: 0,
    relaxed: 0,
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

import { FileText, Settings, Trash2 } from "lucide-react";
// ─── Reusable Upload State Hook & Component ──────────────────────────────────
import { Progress } from "@/components/ui/progress";

interface MediaState {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error: string | null;
  filePreview: string | null;
  fileName: string | null;
}

function PhotoUploadZone({
  label,
  mediaState,
  onChange,
  onRemove,
  language,
}: {
  label: string;
  mediaState: MediaState;
  onChange: (file: File) => void;
  onRemove: () => void;
  language: "pt" | "en";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const openSettings = () => {
    toast.info(
      language === "pt"
        ? "Para conceder permissão de câmara/ficheiro, aceda às definições do seu browser."
        : "To grant camera/file permission, access your browser settings.",
    );
  };

  return (
    <div className="space-y-1.5 text-left" aria-live="polite">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        {label}
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {mediaState.status === "idle" && (
        <div
          onClick={triggerInput}
          className="border-2 border-dashed border-border/60 hover:border-primary/50 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-secondary/40 active-scale"
        >
          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-xs font-semibold text-foreground">
            {language === "pt"
              ? "Carregar Imagem ou PDF"
              : "Upload Image or PDF"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 leading-normal max-w-[200px]">
            {language === "pt"
              ? "Formatos aceites: JPG, PNG, PDF. Limite: 20 MB."
              : "Accepted formats: JPG, PNG, PDF. Max: 20 MB."}
          </span>
        </div>
      )}

      {mediaState.status === "uploading" && (
        <div className="border border-border/40 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            {language === "pt" ? "A enviar..." : "Uploading..."}
          </span>
          <Progress
            value={mediaState.progress}
            className="w-full bg-white/10 h-2"
          />
          <span className="text-xs text-foreground mt-1.5 font-bold">
            {mediaState.progress}%
          </span>
        </div>
      )}

      {mediaState.status === "processing" && (
        <div className="border border-border/40 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider animate-pulse">
            {language === "pt" ? "A analisar..." : "Analyzing..."}
          </span>
        </div>
      )}

      {mediaState.status === "success" && (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mediaState.filePreview &&
            !mediaState.filePreview.startsWith("data:application/pdf") ? (
              <img
                src={mediaState.filePreview}
                alt="Uploaded preview"
                className="w-12 h-12 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-primary border border-border">
                <FileText size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate max-w-[150px]">
                {mediaState.fileName ||
                  (language === "pt" ? "Ficheiro carregado" : "File uploaded")}
              </p>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                <Check size={10} strokeWidth={2.5} />{" "}
                {language === "pt" ? "Sucesso" : "Success"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerInput}
              className="text-[10px] h-8 border-border/60 hover:text-primary"
            >
              {language === "pt" ? "Substituir" : "Replace"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="w-8 h-8 text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )}

      {mediaState.status === "error" && (
        <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 text-left">
              <span className="text-xs font-bold text-rose-400">
                {language === "pt" ? "Falha no envio" : "Upload failed"}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {mediaState.error}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {mediaState.error?.includes("permissão") ||
            mediaState.error?.includes("permission") ? (
              <Button
                type="button"
                size="sm"
                onClick={openSettings}
                className="text-xs h-8 bg-primary hover:bg-emerald-600 text-white"
              >
                <Settings size={12} className="mr-1" />
                {language === "pt" ? "Definições" : "Settings"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerInput}
              className="text-xs h-8 border-white/10 hover:text-foreground"
            >
              {language === "pt" ? "Tentar novamente" : "Try again"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              {language === "pt" ? "Remover" : "Remove"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Breed Autocomplete Component ─────────────────────────────────────────────

function BreedAutocomplete({
  species,
  value,
  onChange,
  placeholder,
  className,
  id,
}: {
  species: "dog" | "cat" | "" | undefined;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const query = encodeURIComponent(value.trim());
        let results: string[] = [];

        if (species === "dog") {
          const res = await fetch(
            `https://api.thedogapi.com/v1/breeds/search?q=${query}`,
            { signal: controller.signal },
          );
          if (res.ok) {
            const data = await res.json();
            results = data.map((item: any) => item.name);
          }
        } else if (species === "cat") {
          const res = await fetch(
            `https://api.thecatapi.com/v1/breeds/search?q=${query}`,
            { signal: controller.signal },
          );
          if (res.ok) {
            const data = await res.json();
            results = data.map((item: any) => item.name);
          }
        } else {
          // If species is not defined, fetch from both
          const [dogRes, catRes] = await Promise.all([
            fetch(`https://api.thedogapi.com/v1/breeds/search?q=${query}`, {
              signal: controller.signal,
            }).catch(() => null),
            fetch(`https://api.thedogapi.com/v1/breeds/search?q=${query}`, {
              signal: controller.signal,
            }).catch(() => null),
          ]);

          const dogData = dogRes?.ok ? await dogRes.json() : [];
          const catData = catRes?.ok ? await catRes.json() : [];

          const dogBreeds = Array.isArray(dogData)
            ? dogData.map((item: any) => item.name)
            : [];
          const catBreeds = Array.isArray(catData)
            ? catData.map((item: any) => item.name)
            : [];

          results = [...dogBreeds, ...catBreeds];
        }

        const uniqueResults = Array.from(new Set(results))
          .filter(Boolean)
          .slice(0, 6);
        setSuggestions(uniqueResults);
        setIsOpen(uniqueResults.length > 0);
      } catch (err) {
        console.error("Autocomplete fetch failed or timed out:", err);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, species]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-border rounded-xl shadow-xl overflow-hidden z-[100] max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-150 border-b border-border/10 last:border-b-0 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Animal Form ──────────────────────────────────────────────────────────

export function AddAnimalForm({ onClose }: { onClose: () => void }) {
  const { t, language } = useLanguage();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"manual" | "microchip" | "ocr">(
    "manual",
  );

  // Manual / Shared fields
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "unknown">("unknown");
  const [color, setColor] = useState("");
  const [coat, setCoat] = useState<"short" | "medium" | "long" | "">("");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [height, _setHeight] = useState("");
  const [tail, _setTail] = useState<
    "long" | "short" | "docked" | "tailless" | ""
  >("");
  const [specialMarkings, setSpecialMarkings] = useState("");

  // OCR Image / File states
  const [ocrMediaState, setOcrMediaState] = useState<MediaState>({
    status: "idle",
    progress: 0,
    error: null,
    filePreview: null,
    fileName: null,
  });
  const [_simulateOcrFail, _setSimulateOcrFail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo upload states (Option A & B photo)
  const [photoMediaState, setPhotoMediaState] = useState<MediaState>({
    status: "idle",
    progress: 0,
    error: null,
    filePreview: null,
    fileName: null,
  });

  const [nameBlurred, setNameBlurred] = useState(false);
  const [specialMarkingsBlurred, setSpecialMarkingsBlurred] = useState(false);
  const [_breedSuggestions, setBreedSuggestions] = useState<
    Array<{ breed: string; confidence: number }>
  >([]);
  const [predictionInfo, setPredictionInfo] = useState<{
    predictedBreed: string;
    confidence: number;
    animalType: "dog" | "cat";
  } | null>(null);

  const isNameValid = name.trim().length > 0 && name.length <= 50;
  const isSpecialMarkingsValid = specialMarkings.length <= 500;
  const isMicrochipValid =
    activeTab === "microchip"
      ? /^\d{15}$/.test(microchipNumber)
      : microchipNumber.trim() === ""
        ? true
        : /^\d{15}$/.test(microchipNumber);

  const isFormValid =
    activeTab === "microchip"
      ? isNameValid && isMicrochipValid
      : isNameValid && isSpecialMarkingsValid && isMicrochipValid;

  const nameError =
    nameBlurred && !isNameValid
      ? name.length > 50
        ? "O nome do animal excede o limite permitido (máx. 50 caracteres)."
        : "O nome do animal é obrigatório."
      : "";

  const specialMarkingsError =
    specialMarkingsBlurred && !isSpecialMarkingsValid
      ? "Os sinais particulares devem ter no máximo 500 caracteres."
      : "";

  const [microchipBlurred, setMicrochipBlurred] = useState(false);
  const microchipValidationError =
    (activeTab === "microchip" || microchipNumber.length > 0) &&
    (microchipBlurred || microchipNumber.length > 0) &&
    !/^\d{15}$/.test(microchipNumber)
      ? "O número de microchip deve ter exatamente 15 dígitos"
      : "";

  const saveBreedFeedbackMutation = trpc.animals.saveBreedFeedback.useMutation({
    onError: (err) => console.error("Error saving breed feedback:", err),
  });

  const addMutation = trpc.animals.add.useMutation({
    onSuccess: () => {
      toast.success(t("profilePage.saveSuccess"));
      if (predictionInfo) {
        saveBreedFeedbackMutation.mutate({
          animalType: predictionInfo.animalType,
          predictedBreed: predictionInfo.predictedBreed,
          confirmedBreed: breed.trim(),
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
    if (!isFormValid) return;

    if (activeTab === "microchip") {
      addMutation.mutate({
        name: name.trim(),
        species,
        microchipNumber: microchipNumber.trim(),
      });
      return;
    }

    const finalBreed = breed;
    const photoUrlToSave =
      activeTab === "ocr"
        ? ocrMediaState.filePreview
        : photoMediaState.filePreview;

    addMutation.mutate({
      name: name.trim(),
      species,
      breed: finalBreed.trim() || undefined,
      age: age ? parseInt(age, 10) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      sex,
      color: color.trim() || undefined,
      coat: coat || undefined,
      microchipNumber: microchipNumber.trim() || undefined,
      height: height.trim() || undefined,
      tail: tail || undefined,
      specialMarkings: specialMarkings.trim() || undefined,
      weight: weight.trim() || undefined,
      photoUrl: photoUrlToSave || undefined,
    });
  };

  // Photo selection zone (Manual / Microchip)
  const handlePhotoUpload = (file: File) => {
    if (!validateUploadedFile(file, "image", language)) {
      setPhotoMediaState({
        status: "error",
        progress: 0,
        error: language === "pt" ? "Ficheiro inválido ou demasiado grande. Máximo 5MB (JPG, PNG, WEBP)." : "Invalid file or too large. Max 5MB (JPG, PNG, WEBP).",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    if (!navigator.onLine) {
      setPhotoMediaState({
        status: "error",
        progress: 0,
        error: "Ligação interrompida. Tentar novamente.",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    setPhotoMediaState({
      status: "uploading",
      progress: 0,
      error: null,
      filePreview: null,
      fileName: file.name,
    });

    const duration = 800; // 0.8s
    const step = 10;
    const increment = 100 / (duration / step);
    let curProgress = 0;

    const interval = setInterval(() => {
      curProgress = Math.min(100, curProgress + increment);
      setPhotoMediaState((prev) => ({
        ...prev,
        progress: Math.round(curProgress),
      }));

      if (curProgress >= 100) {
        clearInterval(interval);

        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoMediaState({
            status: "success",
            progress: 100,
            error: null,
            filePreview: reader.result as string,
            fileName: file.name,
          });
          toast.success(
            language === "pt" ? "Foto carregada!" : "Photo uploaded!",
          );
        };
        reader.readAsDataURL(file);
      }
    }, step);
  };

  // Bulletin selection zone (OCR)
  const handleOcrUpload = (file: File) => {
    if (!validateUploadedFile(file, "bulletin", language)) {
      setOcrMediaState({
        status: "error",
        progress: 0,
        error: language === "pt" ? "Ficheiro inválido ou demasiado grande. Máximo 5MB (JPG, PNG, WEBP, PDF)." : "Invalid file or too large. Max 5MB (JPG, PNG, WEBP, PDF).",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    if (!navigator.onLine) {
      setOcrMediaState({
        status: "error",
        progress: 0,
        error: "Ligação interrompida. Tentar novamente.",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOcrMediaState({
        status: "uploading",
        progress: 0,
        error: null,
        filePreview: reader.result as string,
        fileName: file.name,
      });

      const duration = 800; // 0.8s
      const step = 10;
      const increment = 100 / (duration / step);
      let curProgress = 0;

      const interval = setInterval(() => {
        curProgress = Math.min(100, curProgress + increment);
        setOcrMediaState((prev) => ({
          ...prev,
          progress: Math.round(curProgress),
        }));

        if (curProgress >= 100) {
          clearInterval(interval);
          setOcrMediaState((prev) => ({ ...prev, status: "processing" }));

          setTimeout(() => {
            setOcrMediaState((prev) => ({
              ...prev,
              status: "error",
              error:
                "Não foi possível analisar o ficheiro. Tenta novamente ou preenche manualmente.",
            }));
          }, 1800); // 1.8 seconds processing
        }
      }, step);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter text-left">
      <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/30">
        {(["manual", "microchip", "ocr"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => {
              setActiveTab(method);
              setPredictionInfo(null);
              setBreedSuggestions([]);
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 active-scale",
              activeTab === method
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {method === "manual"
              ? "Manual"
              : method === "microchip"
                ? "Microchip"
                : "Boletim (OCR)"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {activeTab === "manual" && (
          <div className="space-y-3">
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
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {s === "dog"
                    ? t("profilePage.speciesDog")
                    : t("profilePage.speciesCat")}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  {t("profilePage.name")} *
                </Label>
                <div className="flex items-center gap-2">
                  {isNameValid && (
                    <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                      <Check size={10} />
                    </span>
                  )}
                  <span
                    className={`text-[10px] ${name.length > 45 ? "text-red-500 font-semibold animate-pulse" : "text-muted-foreground"}`}
                  >
                    {name.length}/50
                  </span>
                </div>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameBlurred(true)}
                placeholder="Ex: Bobi"
                maxLength={50}
                className={`bg-secondary border-border ${
                  nameError
                    ? "border-red-500 focus-visible:ring-red-500/50"
                    : ""
                } ${isNameValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
              />
              {nameError && (
                <p className="text-[10px] text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="breed" className="text-xs text-muted-foreground">
                {t("profilePage.breed")}
              </Label>
              <BreedAutocomplete
                id="breed"
                species={species}
                value={breed}
                onChange={setBreed}
                placeholder={t("profilePage.breedPlaceholder")}
                className="bg-secondary border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="age" className="text-xs text-muted-foreground">
                  {t("profilePage.age")}
                </Label>
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
                <Label
                  htmlFor="weight"
                  className="text-xs text-muted-foreground"
                >
                  {language === "pt" ? "Peso" : "Weight"}
                </Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 12 kg"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="dateOfBirth"
                  className="text-xs text-muted-foreground"
                >
                  {t("profilePage.dateOfBirth")}
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-secondary border-border text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="color"
                  className="text-xs text-muted-foreground"
                >
                  {t("profilePage.color")}
                </Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ex: Castanho"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("profilePage.sex")}
              </Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "male", label: t("profilePage.sexMale") },
                    { value: "female", label: t("profilePage.sexFemale") },
                    { value: "unknown", label: t("profilePage.sexUnknown") },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSex(s.value)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-200",
                      sex === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="microchipNumber"
                className="text-xs text-muted-foreground"
              >
                {t("profilePage.microchip")}
              </Label>
              <Input
                id="microchipNumber"
                value={microchipNumber}
                onChange={(e) =>
                  setMicrochipNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 15),
                  )
                }
                onBlur={() => setMicrochipBlurred(true)}
                placeholder="Ex: 900115000678234"
                className={cn(
                  "bg-secondary border-border",
                  microchipValidationError && "border-red-500",
                )}
              />
              {microchipValidationError && (
                <p className="text-[10px] text-red-400 font-medium mt-1 flex gap-1 items-start">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{microchipValidationError}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("profilePage.coat")}
              </Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "short", label: t("profilePage.coatShort") },
                    { value: "medium", label: t("profilePage.coatMedium") },
                    { value: "long", label: t("profilePage.coatLong") },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCoat(coat === c.value ? "" : c.value)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-200",
                      coat === c.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <PhotoUploadZone
              label={language === "pt" ? "Foto do Animal" : "Pet Photo"}
              mediaState={photoMediaState}
              onChange={handlePhotoUpload}
              onRemove={() =>
                setPhotoMediaState({
                  status: "idle",
                  progress: 0,
                  error: null,
                  filePreview: null,
                  fileName: null,
                })
              }
              language={language}
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="specialMarkings"
                  className="text-xs text-muted-foreground"
                >
                  {t("profilePage.specialMarkings")}
                </Label>
                <span
                  className={`text-[10px] ${specialMarkings.length > 450 ? "text-red-500 font-semibold animate-pulse" : "text-muted-foreground"}`}
                >
                  {specialMarkings.length}/500
                </span>
              </div>
              <textarea
                id="specialMarkings"
                value={specialMarkings}
                onChange={(e) => setSpecialMarkings(e.target.value)}
                onBlur={() => setSpecialMarkingsBlurred(true)}
                placeholder="Sinais particulares, manchas, cicatrizes..."
                maxLength={600}
                className={`w-full text-xs p-3 rounded-md bg-secondary border text-foreground min-h-[60px] focus:outline-none ${
                  specialMarkingsError
                    ? "border-red-500 focus:border-red-500"
                    : "border-border"
                }`}
              />
              {specialMarkingsError && (
                <p className="text-[10px] text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{specialMarkingsError}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "microchip" && (
          <div className="space-y-3">
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
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {s === "dog"
                    ? t("profilePage.speciesDog")
                    : t("profilePage.speciesCat")}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  {t("profilePage.name")} *
                </Label>
                <div className="flex items-center gap-2">
                  {isNameValid && (
                    <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                      <Check size={10} />
                    </span>
                  )}
                  <span
                    className={`text-[10px] ${name.length > 45 ? "text-red-500 font-semibold animate-pulse" : "text-muted-foreground"}`}
                  >
                    {name.length}/50
                  </span>
                </div>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameBlurred(true)}
                placeholder="Ex: Bobi"
                maxLength={50}
                className={`bg-secondary border-border ${
                  nameError
                    ? "border-red-500 focus-visible:ring-red-500/50"
                    : ""
                } ${isNameValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
              />
              {nameError && (
                <p className="text-[10px] text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="microchipNumber"
                className="text-xs text-muted-foreground"
              >
                {t("profilePage.microchip")} *
              </Label>
              <Input
                id="microchipNumber"
                value={microchipNumber}
                onChange={(e) =>
                  setMicrochipNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 15),
                  )
                }
                onBlur={() => setMicrochipBlurred(true)}
                placeholder="Ex: 900115000678234"
                className={cn(
                  "bg-secondary border-border",
                  microchipValidationError && "border-red-500",
                )}
                required
              />
              {microchipValidationError && (
                <p className="text-[10px] text-red-400 font-medium mt-1 flex gap-1 items-start">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{microchipValidationError}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "ocr" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {language === "pt"
                  ? "Importar do Boletim (OCR)"
                  : "Import from Bulletin (OCR)"}
              </span>
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-semibold"
              >
                {language === "pt" ? "Em breve" : "Coming soon"}
              </Badge>
            </div>

            {ocrMediaState.status === "idle" && (
              <div className="space-y-1.5 text-left" aria-live="polite">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {language === "pt"
                    ? "Boletim de Vacinas"
                    : "Vaccination Bulletin"}
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/60 hover:border-primary/50 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-secondary/40 active-scale"
                >
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold text-foreground">
                    {language === "pt"
                      ? "Fotografar boletim"
                      : "Photograph bulletin"}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 leading-normal max-w-[200px]">
                    {language === "pt"
                      ? "Formatos aceites: JPG, PNG, PDF. Limite: 20 MB."
                      : "Accepted formats: JPG, PNG, PDF. Max: 20 MB."}
                  </span>
                </div>
              </div>
            )}

            {ocrMediaState.status === "uploading" && (
              <div
                className="border border-border/40 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center"
                aria-live="polite"
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                  {language === "pt" ? "A enviar..." : "Uploading..."}
                </span>
                <Progress
                  value={ocrMediaState.progress}
                  className="w-full bg-white/10 h-2"
                />
                <span className="text-xs text-foreground mt-1.5 font-bold">
                  {ocrMediaState.progress}%
                </span>
              </div>
            )}

            {ocrMediaState.status === "processing" && (
              <div
                className="border border-border/40 bg-secondary/20 rounded-2xl p-5 flex flex-col items-center justify-center"
                aria-live="polite"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider animate-pulse">
                  {language === "pt"
                    ? "A processar OCR..."
                    : "Processing OCR..."}
                </span>
              </div>
            )}

            {ocrMediaState.status === "error" && (
              <div className="space-y-3" aria-live="polite">
                {ocrMediaState.filePreview && (
                  <div className="rounded-2xl border border-border overflow-hidden bg-slate-950 flex items-center justify-center h-48 relative">
                    {ocrMediaState.filePreview.startsWith(
                      "data:application/pdf",
                    ) ? (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-12 h-12 text-primary mb-2" />
                        <span className="text-xs truncate max-w-[240px]">
                          {ocrMediaState.fileName}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={ocrMediaState.filePreview}
                        alt="Bulletin Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                )}

                <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                    <div className="min-w-0 flex-1 text-left">
                      <span className="text-xs font-bold text-rose-400">
                        {language === "pt"
                          ? "Erro no processamento"
                          : "Processing error"}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed text-rose-200">
                        {ocrMediaState.error}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOcrMediaState({
                          status: "idle",
                          progress: 0,
                          error: null,
                          filePreview: null,
                          fileName: null,
                        });
                      }}
                      className="text-xs h-8 border-white/10 hover:text-foreground"
                    >
                      {language === "pt" ? "Tentar novamente" : "Try again"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setActiveTab("manual");
                        setOcrMediaState({
                          status: "idle",
                          progress: 0,
                          error: null,
                          filePreview: null,
                          fileName: null,
                        });
                      }}
                      className="text-xs h-8 bg-primary hover:bg-emerald-600 text-white"
                    >
                      {language === "pt"
                        ? "Preencher manualmente"
                        : "Fill manually"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOcrUpload(file);
              }}
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
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
            disabled={
              addMutation.isPending ||
              !isFormValid ||
              (activeTab === "ocr" && ocrMediaState.status !== "success")
            }
            className={`flex-1 font-semibold transition-all ${
              isFormValid &&
              (activeTab !== "ocr" || ocrMediaState.status === "success")
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

// ─── Edit Animal Form ──────────────────────────────────────────────────────────

export function EditAnimalForm({
  animal,
  onClose,
}: {
  animal: any;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const utils = trpc.useUtils();

  const [name, setName] = useState(animal.name || "");
  const [species, setSpecies] = useState<"dog" | "cat">(
    animal.species || "dog",
  );
  const [breed, setBreed] = useState(animal.breed || "");
  const [age, setAge] = useState(animal.age !== null ? String(animal.age) : "");
  const [weight, setWeight] = useState(animal.weight || "");
  const [dateOfBirth, setDateOfBirth] = useState(animal.dateOfBirth || "");
  const [sex, setSex] = useState<"male" | "female" | "unknown">(
    animal.sex || "unknown",
  );
  const [color, setColor] = useState(animal.color || "");
  const [coat, _setCoat] = useState<"short" | "medium" | "long" | "">(
    animal.coat || "",
  );
  const [microchipNumber, setMicrochipNumber] = useState(
    animal.microchipNumber || "",
  );
  const [height, setHeight] = useState(animal.height || "");
  const [tail, setTail] = useState<
    "long" | "short" | "docked" | "tailless" | ""
  >(animal.tail || "");
  const [specialMarkings, setSpecialMarkings] = useState(
    animal.specialMarkings || "",
  );

  const [photoMediaState, setPhotoMediaState] = useState<MediaState>({
    status: animal.photoUrl ? "success" : "idle",
    progress: animal.photoUrl ? 100 : 0,
    error: null,
    filePreview: animal.photoUrl || null,
    fileName: animal.photoUrl ? "photo.jpg" : null,
  });

  const [nameBlurred, setNameBlurred] = useState(false);
  const [specialMarkingsBlurred, setSpecialMarkingsBlurred] = useState(false);
  const [microchipBlurred, setMicrochipBlurred] = useState(false);

  const isNameValid = name.trim().length > 0 && name.length <= 50;
  const isSpecialMarkingsValid = specialMarkings.length <= 500;
  const isMicrochipValid =
    microchipNumber.trim() === ""
      ? true
      : /^\d{15}$/.test(microchipNumber.trim());
  const isFormValid = isNameValid && isSpecialMarkingsValid && isMicrochipValid;

  const nameError =
    nameBlurred && !isNameValid
      ? name.length > 50
        ? "O nome do animal excede o limite (máx. 50 caracteres)."
        : "O nome é obrigatório."
      : "";

  const specialMarkingsError =
    specialMarkingsBlurred && !isSpecialMarkingsValid
      ? "Os sinais particulares devem ter no máximo 500 caracteres."
      : "";

  const microchipValidationError =
    (microchipBlurred || microchipNumber.length > 0) &&
    microchipNumber.length > 0 &&
    !/^\d{15}$/.test(microchipNumber)
      ? "O número de microchip deve ter exatamente 15 dígitos"
      : "";

  const updateMutation = trpc.animals.update.useMutation({
    onSuccess: () => {
      toast.success(
        language === "pt"
          ? "Perfil atualizado com sucesso!"
          : "Profile updated successfully!",
      );
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
      onClose();
    },
    onError: () => toast.error(t("profilePage.saveError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const finalBreed = breed;

    updateMutation.mutate({
      animalId: animal.id,
      name: name.trim(),
      species,
      breed: finalBreed.trim() || undefined,
      age: age ? parseInt(age, 10) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      sex,
      color: color.trim() || undefined,
      coat: coat || undefined,
      microchipNumber: microchipNumber.trim() || undefined,
      height: height.trim() || undefined,
      tail: tail || undefined,
      specialMarkings: specialMarkings.trim() || undefined,
      weight: weight.trim() || undefined,
      photoUrl: photoMediaState.filePreview,
    });
  };

  const handlePhotoUpload = (file: File) => {
    if (!validateUploadedFile(file, "image", language)) {
      setPhotoMediaState({
        status: "error",
        progress: 0,
        error: language === "pt" ? "Ficheiro inválido ou demasiado grande. Máximo 5MB (JPG, PNG, WEBP)." : "Invalid file or too large. Max 5MB (JPG, PNG, WEBP).",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    if (!navigator.onLine) {
      setPhotoMediaState({
        status: "error",
        progress: 0,
        error: "Ligação interrompida. Tentar novamente.",
        filePreview: null,
        fileName: file.name,
      });
      return;
    }

    setPhotoMediaState({
      status: "uploading",
      progress: 0,
      error: null,
      filePreview: null,
      fileName: file.name,
    });

    const duration = 800; // 0.8s
    const step = 10;
    const increment = 100 / (duration / step);
    let curProgress = 0;

    const interval = setInterval(() => {
      curProgress = Math.min(100, curProgress + increment);
      setPhotoMediaState((prev) => ({
        ...prev,
        progress: Math.round(curProgress),
      }));

      if (curProgress >= 100) {
        clearInterval(interval);

        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoMediaState({
            status: "success",
            progress: 100,
            error: null,
            filePreview: reader.result as string,
            fileName: file.name,
          });
          toast.success(
            language === "pt" ? "Foto atualizada!" : "Photo updated!",
          );
        };
        reader.readAsDataURL(file);
      }
    }, step);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 page-enter text-left">
      <form onSubmit={handleSubmit} className="space-y-3">
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
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {s === "dog"
                ? t("profilePage.speciesDog")
                : t("profilePage.speciesCat")}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label
              htmlFor="edit-name"
              className="text-xs text-muted-foreground"
            >
              {t("profilePage.name")} *
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {name.length}/50
            </span>
          </div>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameBlurred(true)}
            placeholder="Ex: Bobi"
            maxLength={50}
            className={`bg-secondary border-border ${nameError ? "border-red-500" : ""}`}
            required
          />
          {nameError && (
            <p className="text-[10px] text-red-400 font-medium mt-1">
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-breed" className="text-xs text-muted-foreground">
            {t("profilePage.breed")}
          </Label>
          <BreedAutocomplete
            id="edit-breed"
            species={species}
            value={breed}
            onChange={setBreed}
            placeholder={t("profilePage.breedPlaceholder")}
            className="bg-secondary border-border"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="edit-age" className="text-xs text-muted-foreground">
              {t("profilePage.age")}
            </Label>
            <Input
              id="edit-age"
              type="number"
              min={0}
              max={30}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="edit-weight"
              className="text-xs text-muted-foreground"
            >
              {language === "pt" ? "Peso" : "Weight"}
            </Label>
            <Input
              id="edit-weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="edit-dob" className="text-xs text-muted-foreground">
              {t("profilePage.dateOfBirth")}
            </Label>
            <Input
              id="edit-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="bg-secondary border-border text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="edit-color"
              className="text-xs text-muted-foreground"
            >
              {t("profilePage.color")}
            </Label>
            <Input
              id="edit-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t("profilePage.sex")}
          </Label>
          <div className="flex gap-2">
            {(
              [
                { value: "male", label: t("profilePage.sexMale") },
                { value: "female", label: t("profilePage.sexFemale") },
                { value: "unknown", label: t("profilePage.sexUnknown") },
              ] as const
            ).map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSex(s.value)}
                className={cn(
                  "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-200",
                  sex === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="edit-microchip"
            className="text-xs text-muted-foreground"
          >
            {t("profilePage.microchip")}
          </Label>
          <Input
            id="edit-microchip"
            value={microchipNumber}
            onChange={(e) =>
              setMicrochipNumber(e.target.value.replace(/\D/g, "").slice(0, 15))
            }
            onBlur={() => setMicrochipBlurred(true)}
            placeholder="Ex: 900115000678234"
            className={cn(
              "bg-secondary border-border",
              microchipValidationError && "border-red-500",
            )}
          />
          {microchipValidationError && (
            <p className="text-[10px] text-red-400 font-medium mt-1 flex gap-1 items-start">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{microchipValidationError}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="edit-height"
              className="text-xs text-muted-foreground"
            >
              {t("profilePage.height")}
            </Label>
            <Input
              id="edit-height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="edit-tail"
              className="text-xs text-muted-foreground"
            >
              {t("profilePage.tail")}
            </Label>
            <select
              id="edit-tail"
              value={tail}
              onChange={(e) => setTail(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm border-border text-foreground"
            >
              <option value="">{t("profilePage.tail")}</option>
              <option value="long">{t("profilePage.tailLong")}</option>
              <option value="short">{t("profilePage.tailShort")}</option>
              <option value="docked">{t("profilePage.tailDocked")}</option>
              <option value="tailless">{t("profilePage.tailTailless")}</option>
            </select>
          </div>
        </div>

        <PhotoUploadZone
          label={language === "pt" ? "Foto do Animal" : "Pet Photo"}
          mediaState={photoMediaState}
          onChange={handlePhotoUpload}
          onRemove={() =>
            setPhotoMediaState({
              status: "idle",
              progress: 0,
              error: null,
              filePreview: null,
              fileName: null,
            })
          }
          language={language}
        />

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label
              htmlFor="edit-special"
              className="text-xs text-muted-foreground"
            >
              {t("profilePage.specialMarkings")}
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {specialMarkings.length}/500
            </span>
          </div>
          <textarea
            id="edit-special"
            value={specialMarkings}
            onChange={(e) => setSpecialMarkings(e.target.value)}
            onBlur={() => setSpecialMarkingsBlurred(true)}
            placeholder="Sinais particulares, manchas, cicatrizes..."
            maxLength={600}
            className={`w-full text-xs p-3 rounded-md bg-secondary border text-foreground min-h-[60px] focus:outline-none ${
              specialMarkingsError ? "border-red-500" : "border-border"
            }`}
          />
          {specialMarkingsError && (
            <p className="text-[10px] text-red-400 font-medium mt-1">
              {specialMarkingsError}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
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
            disabled={updateMutation.isPending || !isFormValid}
            className={`flex-1 font-semibold transition-all ${
              isFormValid
                ? "bg-primary text-primary-foreground hover:bg-emerald-600 shadow-md shadow-primary/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border-border"
            }`}
          >
            {updateMutation.isPending ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default function ProfilePage() {
  const { t, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [, setLocation] = useLocation();
  const {
    data: animals = [],
    isLoading,
    error,
    refetch,
  } = trpc.animals.list.useQuery();
  const utils = trpc.useUtils();

  const _setActiveMutation = trpc.animals.setActive.useMutation({
    onSuccess: () => {
      utils.animals.list.invalidate();
      utils.animals.getActive.invalidate();
    },
  });

  const activeAnimal = animals.find((a) => a.isActive) ?? animals[0];

  if (isLoading) {
    return <AppShellSkeleton mode="content" variant="profile" />;
  }

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {t("profilePage.title")}
        </h1>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus size={16} />
          {t("common.add")}
        </Button>
      </div>

      {/* Add form using vaul Drawer */}
      <Drawer.Root open={showForm} onOpenChange={setShowForm}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm animate-fade-in" />
          <Drawer.Content className="bg-slate-900 border-t border-slate-800 flex flex-col rounded-t-3xl h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none max-w-lg mx-auto">
            <div className="p-4 bg-slate-900 flex-1 overflow-y-auto rounded-t-3xl scrollbar-none">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <Drawer.Title className="text-lg font-bold text-foreground text-center mb-4">
                {language === "pt" ? "Adicionar Novo Animal" : "Add New Animal"}
              </Drawer.Title>
              <AddAnimalForm onClose={() => setShowForm(false)} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit form using vaul Drawer */}
      <Drawer.Root open={showEditForm} onOpenChange={setShowEditForm}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm animate-fade-in" />
          <Drawer.Content className="bg-slate-900 border-t border-slate-800 flex flex-col rounded-t-3xl h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none max-w-lg mx-auto">
            <div className="p-4 bg-slate-900 flex-1 overflow-y-auto rounded-t-3xl scrollbar-none">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <Drawer.Title className="text-lg font-bold text-foreground text-center mb-4">
                {language === "pt"
                  ? "Editar Perfil do Animal"
                  : "Edit Animal Profile"}
              </Drawer.Title>
              {activeAnimal && (
                <EditAnimalForm
                  animal={activeAnimal}
                  onClose={() => setShowEditForm(false)}
                />
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Animal cards list - 3 States */}
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm text-foreground font-semibold">
            Não foi possível carregar a lista de animais.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Ocorreu uma falha ao comunicar com o servidor da base de dados. Por
            favor, verifique a sua ligação à internet e prima o botão abaixo
            para tentar novamente.
          </p>
          <Button
            size="sm"
            onClick={() => refetch()}
            className="bg-primary text-primary-foreground rounded-xl"
          >
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
          <div className="w-14 h-14 rounded-full bg-secondary/60 flex items-center justify-center">
            <PawPrint size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Ainda não tens animais. Adiciona o teu primeiro companheiro!
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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PawPrint size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{activeAnimal.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeAnimal.breed ?? t("profilePage.unknownBreed")}
                  {activeAnimal.age !== null &&
                    ` · ${activeAnimal.age} ${activeAnimal.age === 1 ? t("profilePage.year") : t("profilePage.years")}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEditForm(true)}
                className="gap-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary text-xs"
              >
                {language === "pt" ? "Editar" : "Edit"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/animal/${activeAnimal.id}`)}
                className="gap-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary text-xs"
              >
                {t("profilePage.viewDetails")}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {t("profilePage.species")}
              </p>
              <p className="font-semibold text-sm">
                {activeAnimal.species === "dog"
                  ? t("profilePage.speciesDog")
                  : t("profilePage.speciesCat")}
              </p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {t("profilePage.age").split(" ")[0]}
              </p>
              <p className="font-semibold text-sm">
                {activeAnimal.age !== null
                  ? `${activeAnimal.age} ${activeAnimal.age === 1 ? t("profilePage.year") : t("profilePage.years")}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
