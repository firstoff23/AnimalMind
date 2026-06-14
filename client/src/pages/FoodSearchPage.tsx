import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Apple,
  CheckCircle,
  Info,
  PawPrint,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type SpeciesKey = "dog" | "cat";

const SUGGESTIONS = [
  "Cenoura",
  "Chocolate",
  "Uva",
  "Leite",
  "Abacate",
  "Frango",
];

export default function FoodSearchPage() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesKey>("dog");

  // Get active pet to pre-select species
  const { data: activeAnimal } = trpc.animals.getActive.useQuery();

  useEffect(() => {
    if (activeAnimal?.species) {
      const sp = activeAnimal.species.toLowerCase();
      if (sp === "dog" || sp === "cat") {
        setSelectedSpecies(sp as SpeciesKey);
      } else {
        setSelectedSpecies("dog");
      }
    }
  }, [activeAnimal]);

  // Query foods
  const {
    data: foods = [],
    isLoading,
    error,
  } = trpc.foods.search.useQuery({
    query,
    species: selectedSpecies,
  });

  const getSeverityConfig = (
    severity: "safe" | "caution" | "dangerous" | "toxic",
  ) => {
    switch (severity) {
      case "safe":
        return {
          badge: language === "pt" ? "Seguro" : "Safe",
          variant: "healthy" as const,
          icon: CheckCircle,
          colorClass:
            "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
          glowClass:
            "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30",
        };
      case "caution":
        return {
          badge: language === "pt" ? "Atenção" : "Caution",
          variant: "warning" as const,
          icon: Info,
          colorClass: "text-amber-400 border-amber-500/20 bg-amber-500/10",
          glowClass:
            "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/30",
        };
      case "dangerous":
        return {
          badge: language === "pt" ? "Perigoso" : "Dangerous",
          variant: "warning" as const,
          icon: AlertCircle,
          colorClass: "text-orange-400 border-orange-500/20 bg-orange-500/10",
          glowClass:
            "hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:border-orange-500/30",
        };
      case "toxic":
        return {
          badge: language === "pt" ? "Tóxico" : "Toxic",
          variant: "critical" as const,
          icon: ShieldAlert,
          colorClass:
            "text-rose-400 border-rose-500/20 bg-rose-500/10 animate-pulse-subtle",
          glowClass:
            "hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:border-rose-500/40 border-rose-500/15 bg-rose-950/5",
        };
    }
  };

  const speciesList = [
    { key: "dog" as const, label: language === "pt" ? "Cão" : "Dog" },
    { key: "cat" as const, label: language === "pt" ? "Gato" : "Cat" },
  ];

  if (isLoading && foods.length === 0) {
    return <AppShellSkeleton mode="content" variant="content" />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-lg flex-col px-4 pb-24 pt-5 select-none page-enter">
      {/* Header */}
      <section className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Apple className="h-3.5 w-3.5" />
              {language === "pt" ? "Nutrição Segura" : "Safe Nutrition"}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {language === "pt" ? "Alimentos" : "Food Dictionary"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {language === "pt"
                ? "Verifica se um alimento é seguro para o teu pet"
                : "Check if a food is safe for your pet"}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_30px_rgba(16,185,129,0.18)]">
            <Apple className="h-6 w-6" />
          </div>
        </div>
      </section>

      {/* Search Input */}
      <section className="mb-4 relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === "pt"
                ? "Pesquisa cenoura, maçã, chocolate..."
                : "Search carrot, apple, chocolate..."
            }
            className="pl-11 pr-10 h-12 bg-card border-border/80 rounded-2xl text-sm placeholder:text-muted-foreground focus-visible:ring-primary/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Limpar pesquisa"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* Species Selection Tabs */}
      <section className="mb-6">
        <div className="grid grid-cols-2 gap-2 bg-secondary/35 p-1 rounded-2xl border border-border/40">
          {speciesList.map((sp) => {
            const active = selectedSpecies === sp.key;
            return (
              <button
                key={sp.key}
                onClick={() => setSelectedSpecies(sp.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-[150ms] ease-out select-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-md scale-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
                )}
              >
                <PawPrint size={14} className="flex-shrink-0" />
                <span className="truncate">{sp.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Results List */}
      <section className="flex-1 flex flex-col gap-6">
        {!query.trim() ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <Search size={28} className="animate-pulse text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-foreground text-sm">
                {language === "pt"
                  ? "Pesquisa um alimento"
                  : "Search for a food"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {language === "pt"
                  ? "Insere o nome de um alimento para verificar se é seguro para o teu cão ou gato."
                  : "Type the name of a food to verify if it is safe for your dog or cat."}
              </p>
            </div>
          </div>
        ) : foods.length > 0 ? (
          <div className="space-y-6">
            {/* Safe Foods */}
            {foods.some((f) => f.computedSeverity === "safe") && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 flex items-center gap-1.5 px-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {language === "pt" ? "Alimentos Seguros" : "Safe Foods"}
                </h2>
                <div className="flex flex-col gap-3 p-3.5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02]">
                  <AnimatePresence mode="popLayout">
                    {foods
                      .filter((f) => f.computedSeverity === "safe")
                      .map((food) => {
                        const config = getSeverityConfig(food.computedSeverity);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={food.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card
                              className={cn(
                                "overflow-hidden border border-border/30 bg-card/75 backdrop-blur-sm shadow-sm transition-all duration-300 rounded-2xl",
                                config.glowClass,
                              )}
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2">
                                      {food.name}
                                    </h3>
                                    {food.aliases &&
                                      food.aliases.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                          {language === "pt"
                                            ? "Nomes comuns: "
                                            : "Common names: "}
                                          {food.aliases.join(", ")}
                                        </p>
                                      )}
                                  </div>
                                  <Badge
                                    variant={config.variant}
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[9px] font-bold border flex items-center gap-1 shrink-0 uppercase tracking-wide",
                                      config.colorClass,
                                    )}
                                  >
                                    <Icon className="h-2.5 w-2.5 shrink-0" />
                                    {config.badge}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {food.reason}
                                </p>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Dangerous Foods */}
            {foods.some((f) => f.computedSeverity !== "safe") && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-500/80 flex items-center gap-1.5 px-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {language === "pt"
                    ? "Alimentos Perigosos ou com Atenção"
                    : "Dangerous or Caution Foods"}
                </h2>
                <div className="flex flex-col gap-3 p-3.5 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02]">
                  <AnimatePresence mode="popLayout">
                    {foods
                      .filter((f) => f.computedSeverity !== "safe")
                      .map((food) => {
                        const config = getSeverityConfig(food.computedSeverity);
                        const Icon = config.icon;
                        const isUnsafe = food.computedSeverity !== "safe";
                        return (
                          <motion.div
                            key={food.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card
                              className={cn(
                                "overflow-hidden border border-border/30 bg-card/75 backdrop-blur-sm shadow-sm transition-all duration-300 rounded-2xl",
                                config.glowClass,
                              )}
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2">
                                      {food.name}
                                    </h3>
                                    {food.aliases &&
                                      food.aliases.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                          {language === "pt"
                                            ? "Nomes comuns: "
                                            : "Common names: "}
                                          {food.aliases.join(", ")}
                                        </p>
                                      )}
                                  </div>
                                  <Badge
                                    variant={config.variant}
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[9px] font-bold border flex items-center gap-1 shrink-0 uppercase tracking-wide",
                                      config.colorClass,
                                    )}
                                  >
                                    <Icon className="h-2.5 w-2.5 shrink-0" />
                                    {config.badge}
                                  </Badge>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {food.reason}
                                </p>

                                {food.symptoms && food.symptoms.length > 0 && (
                                  <Accordion
                                    type="single"
                                    collapsible
                                    className="border-t border-border/30 pt-2"
                                  >
                                    <AccordionItem
                                      value="symptoms"
                                      className="border-0"
                                    >
                                      <AccordionTrigger className="py-2 text-[11px] font-semibold text-muted-foreground hover:no-underline hover:text-foreground">
                                        {language === "pt"
                                          ? "Sintomas clínicos comuns"
                                          : "Common clinical symptoms"}
                                      </AccordionTrigger>
                                      <AccordionContent className="pt-1.5 pb-1">
                                        <div className="flex flex-wrap gap-1.5">
                                          {food.symptoms.map((symptom, i) => (
                                            <Badge
                                              key={i}
                                              variant="outline"
                                              className="bg-black/10 border-border/50 text-[9px] text-foreground font-medium py-0.5 px-2 rounded-lg"
                                            >
                                              {symptom}
                                            </Badge>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}

                                {isUnsafe && food.whatToDo && (
                                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-rose-300 leading-relaxed font-medium">
                                      <p className="font-bold text-[10px] uppercase tracking-wider text-rose-400 mb-0.5">
                                        {language === "pt"
                                          ? "O que fazer"
                                          : "What to do"}
                                      </p>
                                      {food.whatToDo}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title={
              language === "pt" ? "Nenhum alimento encontrado" : "No food found"
            }
            description={
              language === "pt"
                ? "Tenta pesquisar com outros termos ou seleciona uma das sugestões abaixo."
                : "Try searching with other terms or choose one of the suggestions below."
            }
            icon={<Apple className="h-8 w-8 text-primary" />}
            className="py-12"
          />
        )}

        {/* Suggestion tags when search is empty or has no results */}
        <div className="mt-2 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">
            {language === "pt" ? "Sugestões rápidas" : "Quick suggestions"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
            {SUGGESTIONS.map((sug) => (
              <Button
                key={sug}
                variant="outline"
                size="sm"
                onClick={() => setQuery(sug)}
                className="h-8 text-[11px] font-semibold px-3 py-1 bg-secondary/20 hover:bg-secondary/40 border-border/50 text-foreground rounded-xl active-scale"
              >
                {sug}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Veterinarian Disclaimer */}
      <footer className="mt-8 text-center text-[10px] text-muted-foreground/60 leading-relaxed border-t border-border/20 pt-4">
        {language === "pt"
          ? "Aviso: Este dicionário fornece dados informativos e de suporte clínico baseados em fontes veterinárias conhecidas. Não substitui o diagnóstico ou aconselhamento direto de um médico veterinário em caso de ingestão ou emergência."
          : "Disclaimer: This dictionary provides informative data and clinical support based on trusted veterinary sources. It does not replace the diagnosis or direct advice of a veterinarian in case of ingestion or emergency."}
      </footer>
    </div>
  );
}
