import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import HealthBulletinTab from "@/components/HealthBulletinTab";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, PawPrint } from "lucide-react";

export default function HealthPage() {
  const { t, language } = useLanguage();
  const { data: animals = [], refetch } = trpc.animals.list.useQuery();

  // Find active animal or fallback to first animal
  const activeAnimalFromList = animals.find((a) => a.isActive) ?? animals[0];
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  const selectedAnimal = selectedAnimalId
    ? animals.find((a) => a.id === selectedAnimalId)
    : activeAnimalFromList;

  if (animals.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 text-center pt-16">
        <PawPrint className="w-16 h-16 text-muted-foreground mx-auto opacity-50 animate-pulse" />
        <h1 className="text-2xl font-bold text-white">
          {language === "pt" ? "Sem Animais Registados" : "No Registered Animals"}
        </h1>
        <p className="text-slate-400 max-w-sm mx-auto">
          {language === "pt"
            ? "Adicione um animal no seu Perfil antes de aceder ao boletim sanitário."
            : "Please add a pet in your Profile before accessing the health record."}
        </p>
      </div>
    );
  }

  const species = selectedAnimal?.species === "cat" || selectedAnimal?.species === "gato" ? "cat" : "dog";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20" />
            {language === "pt" ? "Boletim Sanitário" : "Health Bulletin"}
          </h1>
          <p className="text-slate-400 mt-1">
            {language === "pt"
              ? "Registo vacinal e clínico oficial do seu companheiro"
              : "Official vaccination and medical records for your pet"}
          </p>
        </div>
      </div>

      {/* Animal Selector */}
      {animals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {animals.map((a) => {
            const isSelected = selectedAnimal?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAnimalId(a.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
                }`}
              >
                <PawPrint size={14} />
                {a.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Animal Quick Info Summary Card */}
      {selectedAnimal && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            {selectedAnimal.photoUrl ? (
              <img
                src={selectedAnimal.photoUrl}
                alt={selectedAnimal.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-secondary/50 border border-slate-850 flex items-center justify-center flex-shrink-0">
                <PawPrint className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white truncate">{selectedAnimal.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {species === "dog" ? (language === "pt" ? "Cão" : "Dog") : (language === "pt" ? "Gato" : "Cat")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {selectedAnimal.breed || (language === "pt" ? "Raça Indefinida" : "Unknown Breed")}
                {selectedAnimal.microchipNumber && ` · Chip: ${selectedAnimal.microchipNumber}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Bulletin Consolidated Tab */}
      {selectedAnimal && (
        <HealthBulletinTab
          animalId={selectedAnimal.id}
          species={species}
          animal={selectedAnimal}
          onRefreshAnimal={refetch}
        />
      )}
    </div>
  );
}
