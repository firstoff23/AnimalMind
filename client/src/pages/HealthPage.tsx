import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import HealthBulletinTab from "@/components/HealthBulletinTab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, PawPrint, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function HealthPage() {
  const { t, language } = useLanguage();
  const { data: animals = [], refetch } = trpc.animals.list.useQuery();
  const [isExporting, setIsExporting] = useState(false);

  // Find active animal or fallback to first animal
  const activeAnimalFromList = animals.find((a) => a.isActive) ?? animals[0];
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  const selectedAnimal = selectedAnimalId
    ? animals.find((a) => a.id === selectedAnimalId)
    : activeAnimalFromList;

  const handleExportPDF = async () => {
    if (!selectedAnimal) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;
      const margin = 15;

      // Header
      doc.setFillColor(99, 102, 241); // indigo
      doc.rect(0, 0, pageW, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("BOLETIM SANIT\u00c1RIO DO ANIMAL DE COMPANHIA", pageW / 2, 9, { align: "center" });
      doc.setFontSize(7);
      doc.text("AnimalMind \u00b7 Gerado automaticamente \u00b7 " + new Date().toLocaleDateString("pt-PT"), pageW / 2, 12.5, { align: "center" });

      y = 24;
      doc.setTextColor(30, 30, 30);

      // Animal identification box
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(margin, y, pageW - margin * 2, 38, 3, 3, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("IDENTIFICA\u00c7\u00c3O DO ANIMAL", margin + 4, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const fields = [
        ["Nome", selectedAnimal.name || "—"],
        ["Esp\u00e9cie", selectedAnimal.species === "cat" ? "Gato" : "C\u00e3o"],
        ["Ra\u00e7a", selectedAnimal.breed || "Indefinida"],
        ["Microchip", selectedAnimal.microchipNumber || "N\u00e3o registado"],
        ["Sexo", selectedAnimal.sex === "male" ? "Macho" : selectedAnimal.sex === "female" ? "F\u00eamea" : "Desconhecido"],
      ];
      fields.forEach(([label, value], i) => {
        const col = i < 3 ? 0 : 1;
        const row = i < 3 ? i : i - 3;
        const x = margin + 4 + col * 85;
        const fy = y + 14 + row * 7;
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", x, fy);
        doc.setFont("helvetica", "normal");
        doc.text(value, x + 22, fy);
      });

      y += 44;

      // Vaccination section
      doc.setFillColor(99, 102, 241);
      doc.rect(margin, y, pageW - margin * 2, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("VACINA\u00c7\u00c3O", margin + 4, y + 5);
      y += 10;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Verifique o boletim digital na aplica\u00e7\u00e3o AnimalMind para a lista completa de vacinas, refor\u00e7os e registos cl\u00ednicos.", margin, y + 5, {
        maxWidth: pageW - margin * 2,
      });
      y += 14;

      // Signature area
      y = doc.internal.pageSize.getHeight() - 30;
      doc.setDrawColor(180, 180, 200);
      doc.line(margin, y, margin + 70, y);
      doc.line(pageW - margin - 70, y, pageW - margin, y);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 140);
      doc.text("M\u00e9dico Veterin\u00e1rio", margin + 35, y + 4, { align: "center" });
      doc.text("Tutor / Propriet\u00e1rio", pageW - margin - 35, y + 4, { align: "center" });

      // Footer
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 180);
      doc.text(
        "Documento gerado por AnimalMind \u00b7 N\u00e3o substitui o boletim oficial DGAV \u00b7 animalmind.vercel.app",
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );

      const safeName = selectedAnimal.name.replace(/[^a-z0-9]/gi, "_");
      doc.save(`boletim_${safeName}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(language === "pt" ? "PDF exportado com sucesso!" : "PDF exported successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(language === "pt" ? "Erro ao exportar PDF." : "Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

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
        {selectedAnimal && (
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 shrink-0"
          >
            <Download size={14} />
            {isExporting
              ? (language === "pt" ? "A gerar..." : "Generating...")
              : (language === "pt" ? "Exportar PDF" : "Export PDF")}
          </Button>
        )}
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
