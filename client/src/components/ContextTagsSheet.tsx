import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const PREDEFINED_TAGS = [
  { id: "storm", pt: "🌩️ Trovoada", en: "🌩️ Storm" },
  { id: "home_alone", pt: "🚶 Sozinho em casa", en: "🚶 Home alone" },
  { id: "other_animal", pt: "🐕 Outro animal", en: "🐕 Other animal" },
  { id: "mealtime", pt: "🍽️ Refeição", en: "🍽️ Mealtime" },
  { id: "travel", pt: "🚗 Viagem", en: "🚗 Travel" },
  { id: "loud_noise", pt: "🎆 Barulho forte", en: "🎆 Loud noise" },
  { id: "sleeping", pt: "😴 A dormir", en: "😴 Sleeping" },
  { id: "exercise", pt: "🏃 Exercício", en: "🏃 Exercise" },
];

interface ContextTagsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedTags: string[]) => void;
}

export function ContextTagsSheet({ open, onOpenChange, onSave }: ContextTagsSheetProps) {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(selectedTags);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setSelectedTags([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4 h-auto max-h-[80vh] flex flex-col">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>{isPt ? "O que aconteceu antes?" : "What happened before?"}</SheetTitle>
          <SheetDescription>
            {isPt ? "Adiciona contexto para melhorar a análise futura." : "Add context to improve future analysis."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mb-6">
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              const label = isPt ? tag.pt : tag.en;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "text-sm px-4 py-2 rounded-full font-medium transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleSave} className="w-full font-bold">
            {isPt ? "Guardar" : "Save"}
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            {isPt ? "Saltar" : "Skip"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
