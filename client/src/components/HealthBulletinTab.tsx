import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Calendar,
  Shield,
  FileText,
  Activity,
  Award,
  PenSquare,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface HealthBulletinTabProps {
  animalId: number;
  species: "dog" | "cat";
  animal: any;
  onRefreshAnimal: () => void;
}

export default function HealthBulletinTab({
  animalId,
  species,
  animal,
  onRefreshAnimal,
}: HealthBulletinTabProps) {
  const { t, language } = useLanguage();
  const utils = trpc.useUtils();

  // Collapsible sections state
  const [expandedSection, setExpandedSection] = useState<string | null>("physical");

  // Form states
  const [isEditingPhysical, setIsEditingPhysical] = useState(false);
  const [physicalForm, setPhysicalForm] = useState({
    height: animal.height || "",
    tail: animal.tail || "",
    specialMarkings: animal.specialMarkings || "",
    color: animal.color || "",
    coat: animal.coat || "short",
    microchipNumber: animal.microchipNumber || "",
  });

  // Dialog / Modal Form Visibility
  const [activeForm, setActiveForm] = useState<"vaccine" | "deworming" | "test" | "treatment" | "license" | null>(null);

  // Input states for vaccine
  const [vaccineForm, setVaccineForm] = useState({
    vaccineName: "",
    vaccineType: "other" as "rabies" | "other",
    dateAdministered: new Date().toISOString().split("T")[0],
    batchNumber: "",
    veterinarian: "",
    nextDueDate: "",
  });

  // Input states for deworming
  const [dewormingForm, setDewormingForm] = useState({
    type: "internal" as "internal" | "external" | "both",
    product: "",
    dosage: "",
    dateAdministered: new Date().toISOString().split("T")[0],
    nextDueDate: "",
  });

  // Input states for diagnostic test
  const [testForm, setTestForm] = useState({
    testName: "",
    datePerformed: new Date().toISOString().split("T")[0],
    result: "",
    notes: "",
  });

  // Input states for other treatments
  const [treatmentForm, setTreatmentForm] = useState({
    treatmentName: "",
    dateAdministered: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Input states for licensing
  const [licenseForm, setLicenseForm] = useState({
    licenseNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    issuingAuthority: "Junta de Freguesia",
    category: "companion" as "companion" | "dangerous" | "potentially_dangerous" | "hunting" | "guard" | "other",
    notes: "",
  });

  // Backend queries
  const { data: vaccinations = [], refetch: refetchVaccines } = trpc.animals.getVaccinations.useQuery({ animalId });
  const { data: dewormings = [], refetch: refetchDewormings } = trpc.animals.getDewormings.useQuery({ animalId });
  const { data: tests = [], refetch: refetchTests } = trpc.animals.getDiagnosticTests.useQuery({ animalId });
  const { data: treatments = [], refetch: refetchTreatments } = trpc.animals.getOtherTreatments.useQuery({ animalId });
  const { data: licenses = [], refetch: refetchLicenses } = trpc.animals.getLicensing.useQuery({ animalId });

  // Backend mutations
  const updateAnimalMutation = trpc.animals.update.useMutation({
    onSuccess: () => {
      toast.success(t("profilePage.saveSuccess"));
      setIsEditingPhysical(false);
      onRefreshAnimal();
    },
    onError: () => toast.error(t("profilePage.saveError")),
  });

  const addVaccineMutation = trpc.animals.addVaccination.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Vacina registada!" : "Vaccine registered!");
      setActiveForm(null);
      refetchVaccines();
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteVaccineMutation = trpc.animals.deleteVaccination.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Vacina eliminada." : "Vaccine deleted.");
      refetchVaccines();
    },
  });

  const addDewormingMutation = trpc.animals.addDeworming.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Desparasitação registada!" : "Deworming registered!");
      setActiveForm(null);
      refetchDewormings();
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteDewormingMutation = trpc.animals.deleteDeworming.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Registo eliminado." : "Record deleted.");
      refetchDewormings();
    },
  });

  const addTestMutation = trpc.animals.addDiagnosticTest.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Teste registado!" : "Test registered!");
      setActiveForm(null);
      refetchTests();
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteTestMutation = trpc.animals.deleteDiagnosticTest.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Teste eliminado." : "Test deleted.");
      refetchTests();
    },
  });

  const addTreatmentMutation = trpc.animals.addOtherTreatment.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Tratamento registado!" : "Treatment registered!");
      setActiveForm(null);
      refetchTreatments();
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteTreatmentMutation = trpc.animals.deleteOtherTreatment.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Tratamento eliminado." : "Treatment deleted.");
      refetchTreatments();
    },
  });

  const addLicenseMutation = trpc.animals.addLicensing.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Licenciamento registado!" : "Licensing registered!");
      setActiveForm(null);
      refetchLicenses();
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteLicenseMutation = trpc.animals.deleteLicensing.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Licença eliminada." : "License deleted.");
      refetchLicenses();
    },
  });

  // Handler for physical features form
  const handlePhysicalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnimalMutation.mutate({
      animalId,
      height: physicalForm.height,
      tail: physicalForm.tail,
      specialMarkings: physicalForm.specialMarkings,
      color: physicalForm.color,
      coat: physicalForm.coat as any,
      microchipNumber: physicalForm.microchipNumber,
    });
  };

  // Species specific vaccines
  const dogVaccines = ["Esgana", "Hepatite", "Parvovirose", "Leptospirose", "Parainfluenza", "Bordetelose", "Babesiose", "Leishmaniose"];
  const catVaccines = ["Herpesvirose", "Calicivirose", "Panleucopénia", "Clamidiose", "Leucemia"];
  const speciesVaccines = species === "dog" ? dogVaccines : catVaccines;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const activeVaccinations = (vaccinations || []).filter((v): v is NonNullable<typeof v> => v !== null);
  const activeDewormings = (dewormings || []).filter((d): d is NonNullable<typeof d> => d !== null);
  const activeTests = (tests || []).filter((t): t is NonNullable<typeof t> => t !== null);
  const activeTreatments = (treatments || []).filter((t): t is NonNullable<typeof t> => t !== null);
  const activeLicenses = (licenses || []).filter((l): l is NonNullable<typeof l> => l !== null);

  const rabiesVaccinations = activeVaccinations.filter(v => v.vaccineType === "rabies");
  const otherVaccinations = activeVaccinations.filter(v => v.vaccineType === "other");

  return (
    <div className="space-y-4">
      {/* ─── 1. CARACTERÍSTICAS FÍSICAS ──────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("physical")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>{t("bulletin.physicalTitle")}</span>
          </div>
          {expandedSection === "physical" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "physical" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {!isEditingPhysical ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.breed")}</span>
                    <span className="font-medium text-foreground">{animal.breed || t("profilePage.breedPlaceholder")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.microchip")}</span>
                    <span className="font-mono font-medium text-foreground">{animal.microchipNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.sex")}</span>
                    <span className="font-medium text-foreground">
                      {animal.sex === "male" ? t("profilePage.sexMale") : animal.sex === "female" ? t("profilePage.sexFemale") : t("profilePage.sexUnknown")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.coat")}</span>
                    <span className="font-medium text-foreground">
                      {animal.coat === "short" ? t("profilePage.coatShort") : animal.coat === "medium" ? t("profilePage.coatMedium") : animal.coat === "long" ? t("profilePage.coatLong") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.color")}</span>
                    <span className="font-medium text-foreground">{animal.color || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.height")}</span>
                    <span className="font-medium text-foreground">{animal.height ? `${animal.height} cm` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t("profilePage.tail")}</span>
                    <span className="font-medium text-foreground">
                      {animal.tail === "long" ? t("profilePage.tailLong") : animal.tail === "short" ? t("profilePage.tailShort") : animal.tail === "docked" ? t("profilePage.tailDocked") : animal.tail === "tailless" ? t("profilePage.tailTailless") : animal.tail || "—"}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground text-xs block mb-1">{t("profilePage.specialMarkings")}</span>
                  <p className="text-xs text-foreground bg-secondary/30 p-2.5 rounded-xl border border-border/40 min-h-[40px]">
                    {animal.specialMarkings || "Sem sinais particulares registados."}
                  </p>
                </div>
                {!animal.isShared && (
                  <Button
                    onClick={() => setIsEditingPhysical(true)}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs font-semibold h-8 rounded-xl"
                  >
                    <PenSquare size={13} /> {t("common.edit")}
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handlePhysicalSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]" htmlFor="edit-height">{t("profilePage.height")}</Label>
                    <Input
                      id="edit-height"
                      type="text"
                      placeholder="Ex: 45"
                      value={physicalForm.height}
                      onChange={e => setPhysicalForm({ ...physicalForm, height: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" htmlFor="edit-microchip">{t("profilePage.microchip")}</Label>
                    <Input
                      id="edit-microchip"
                      type="text"
                      placeholder="15 dígitos"
                      maxLength={15}
                      value={physicalForm.microchipNumber}
                      onChange={e => setPhysicalForm({ ...physicalForm, microchipNumber: e.target.value })}
                      className="text-xs h-8 bg-background border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" htmlFor="edit-coat">{t("profilePage.coat")}</Label>
                    <select
                      id="edit-coat"
                      value={physicalForm.coat}
                      onChange={e => setPhysicalForm({ ...physicalForm, coat: e.target.value })}
                      className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground focus:outline-none"
                    >
                      <option value="short">{t("profilePage.coatShort")}</option>
                      <option value="medium">{t("profilePage.coatMedium")}</option>
                      <option value="long">{t("profilePage.coatLong")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]" htmlFor="edit-tail">{t("profilePage.tail")}</Label>
                    <select
                      id="edit-tail"
                      value={physicalForm.tail}
                      onChange={e => setPhysicalForm({ ...physicalForm, tail: e.target.value })}
                      className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground focus:outline-none"
                    >
                      <option value="long">{t("profilePage.tailLong")}</option>
                      <option value="short">{t("profilePage.tailShort")}</option>
                      <option value="docked">{t("profilePage.tailDocked")}</option>
                      <option value="tailless">{t("profilePage.tailTailless")}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]" htmlFor="edit-color">{t("profilePage.color")}</Label>
                  <Input
                    id="edit-color"
                    type="text"
                    placeholder="Ex: Castanho e Branco"
                    value={physicalForm.color}
                    onChange={e => setPhysicalForm({ ...physicalForm, color: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]" htmlFor="edit-markings">{t("profilePage.specialMarkings")}</Label>
                  <textarea
                    id="edit-markings"
                    placeholder="Sinais particulares, cicatrizes, manchas..."
                    value={physicalForm.specialMarkings}
                    onChange={e => setPhysicalForm({ ...physicalForm, specialMarkings: e.target.value })}
                    className="w-full text-xs p-2 rounded-md bg-background border border-border text-foreground min-h-[50px] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPhysical(false)}
                    className="flex-1 text-xs h-8"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAnimalMutation.isPending}
                    size="sm"
                    className="flex-1 text-xs h-8"
                  >
                    {updateAnimalMutation.isPending ? t("common.loading") : t("common.save")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── 2. VACINAÇÕES ───────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("vaccines")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>{t("bulletin.vaccinesTitle")}</span>
          </div>
          {expandedSection === "vaccines" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "vaccines" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {/* Secção Antirrábica Especial (Obrigatória em PT) */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  ⚠️ {t("bulletin.vaccineTypeRabies")} (DGAV Obrigatória)
                </h4>
              </div>
              {rabiesVaccinations.length > 0 ? (
                <div className="space-y-2.5">
                  {rabiesVaccinations.map(v => (
                    <div key={v.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-foreground">{v.vaccineName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t("common.date")}: {v.dateAdministered} · {t("bulletin.batchNumber")}: {v.batchNumber || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Vet: {v.veterinarian || "—"}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-medium block">Ativa</span>
                          {v.nextDueDate && (
                            <span className="text-[9px] text-muted-foreground block">Reforço: {v.nextDueDate}</span>
                          )}
                        </div>
                        {!animal.isShared && (
                          <button
                            onClick={() => deleteVaccineMutation.mutate({ id: v.id, animalId })}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                            title={t("common.delete")}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">Sem vacina antirrábica ativa registada.</p>
              )}
            </div>

            {/* Outras Vacinas */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Outras Vacinações
              </h4>
              {otherVaccinations.length > 0 ? (
                <div className="space-y-2.5">
                  {otherVaccinations.map(v => (
                    <div key={v.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-foreground">{v.vaccineName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t("common.date")}: {v.dateAdministered} · {t("bulletin.batchNumber")}: {v.batchNumber || "—"}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {v.nextDueDate && (
                          <span className="text-[9px] text-muted-foreground block">Reforço: {v.nextDueDate}</span>
                        )}
                        {!animal.isShared && (
                          <button
                            onClick={() => deleteVaccineMutation.mutate({ id: v.id, animalId })}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t("bulletin.noVaccines")}</p>
              )}
            </div>

            {!animal.isShared && (
              <Button
                onClick={() => {
                  setActiveForm(activeForm === "vaccine" ? null : "vaccine");
                  setVaccineForm({
                    vaccineName: speciesVaccines[0],
                    vaccineType: "other",
                    dateAdministered: new Date().toISOString().split("T")[0],
                    batchNumber: "",
                    veterinarian: "",
                    nextDueDate: "",
                  });
                }}
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs h-8 rounded-xl"
              >
                <Plus size={14} /> {t("bulletin.addVaccine")}
              </Button>
            )}

            {/* Vaccine Form */}
            {activeForm === "vaccine" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addVaccineMutation.mutate({
                    animalId,
                    vaccineName: vaccineForm.vaccineName,
                    vaccineType: vaccineForm.vaccineType,
                    dateAdministered: vaccineForm.dateAdministered,
                    batchNumber: vaccineForm.batchNumber || null,
                    veterinarian: vaccineForm.veterinarian || null,
                    nextDueDate: vaccineForm.nextDueDate || null,
                  });
                }}
                className="bg-secondary/40 border border-border/60 p-4 rounded-xl space-y-3 page-enter"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.vaccineType")}</Label>
                  <select
                    value={vaccineForm.vaccineType}
                    onChange={e => {
                      const type = e.target.value as "rabies" | "other";
                      setVaccineForm({
                        ...vaccineForm,
                        vaccineType: type,
                        vaccineName: type === "rabies" ? "Antirrábica" : speciesVaccines[0]
                      });
                    }}
                    className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground"
                  >
                    <option value="other">{t("bulletin.vaccineTypeOther")}</option>
                    <option value="rabies">{t("bulletin.vaccineTypeRabies")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.vaccineName")}</Label>
                  {vaccineForm.vaccineType === "rabies" ? (
                    <Input
                      value="Antirrábica"
                      disabled
                      className="text-xs h-8 bg-muted border-border"
                    />
                  ) : (
                    <select
                      value={vaccineForm.vaccineName}
                      onChange={e => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
                      className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground"
                    >
                      {speciesVaccines.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="Outra">Outra (Digitar...)</option>
                    </select>
                  )}
                </div>

                {vaccineForm.vaccineName === "Outra" && (
                  <div className="space-y-1">
                    <Label className="text-[11px]">Nome Personalizado</Label>
                    <Input
                      type="text"
                      placeholder="Digite o nome da vacina..."
                      onChange={e => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("common.date")}</Label>
                    <Input
                      type="date"
                      value={vaccineForm.dateAdministered}
                      onChange={e => setVaccineForm({ ...vaccineForm, dateAdministered: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.nextDueDate")}</Label>
                    <Input
                      type="date"
                      value={vaccineForm.nextDueDate}
                      onChange={e => setVaccineForm({ ...vaccineForm, nextDueDate: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.batchNumber")}</Label>
                    <Input
                      type="text"
                      placeholder="Nº Lote"
                      value={vaccineForm.batchNumber}
                      onChange={e => setVaccineForm({ ...vaccineForm, batchNumber: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.veterinarian")}</Label>
                    <Input
                      type="text"
                      placeholder="Cédula/Nome"
                      value={vaccineForm.veterinarian}
                      onChange={e => setVaccineForm({ ...vaccineForm, veterinarian: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={addVaccineMutation.isPending}
                  className="w-full text-xs h-8"
                >
                  {addVaccineMutation.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── 3. DESPARASITAÇÕES ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("deworming")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>{t("bulletin.dewormingTitle")}</span>
          </div>
          {expandedSection === "deworming" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "deworming" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {activeDewormings.length > 0 ? (
              <div className="space-y-3">
                {activeDewormings.map(d => (
                  <div key={d.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-none last:pb-0">
                    <div>
                      <p className="font-semibold text-foreground">
                        {d.product}
                        <Badge variant="outline" className="ml-2 text-[9px] border-indigo-500/20 text-indigo-400 bg-indigo-950/10">
                          {d.type === "internal" ? t("bulletin.dewormingInternal") : d.type === "external" ? t("bulletin.dewormingExternal") : t("bulletin.dewormingBoth")}
                        </Badge>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t("common.date")}: {d.dateAdministered} {d.dosage && `· ${t("bulletin.dosage")}: ${d.dosage}`}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {d.nextDueDate && (
                        <span className="text-[9px] text-muted-foreground block">Reforço: {d.nextDueDate}</span>
                      )}
                      {!animal.isShared && (
                        <button
                          onClick={() => deleteDewormingMutation.mutate({ id: d.id, animalId })}
                          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t("bulletin.noDewormings")}</p>
            )}

            {!animal.isShared && (
              <Button
                onClick={() => {
                  setActiveForm(activeForm === "deworming" ? null : "deworming");
                  setDewormingForm({
                    type: "internal",
                    product: "",
                    dosage: "",
                    dateAdministered: new Date().toISOString().split("T")[0],
                    nextDueDate: "",
                  });
                }}
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs h-8 rounded-xl"
              >
                <Plus size={14} /> {t("bulletin.addDeworming")}
              </Button>
            )}

            {activeForm === "deworming" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addDewormingMutation.mutate({
                    animalId,
                    type: dewormingForm.type,
                    product: dewormingForm.product,
                    dosage: dewormingForm.dosage || null,
                    dateAdministered: dewormingForm.dateAdministered,
                    nextDueDate: dewormingForm.nextDueDate || null,
                  });
                }}
                className="bg-secondary/40 border border-border/60 p-4 rounded-xl space-y-3 page-enter"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.dewormingType")}</Label>
                  <select
                    value={dewormingForm.type}
                    onChange={e => setDewormingForm({ ...dewormingForm, type: e.target.value as any })}
                    className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground"
                  >
                    <option value="internal">{t("bulletin.dewormingInternal")}</option>
                    <option value="external">{t("bulletin.dewormingExternal")}</option>
                    <option value="both">{t("bulletin.dewormingBoth")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.product")}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Milbemax, Bravecto..."
                    value={dewormingForm.product}
                    onChange={e => setDewormingForm({ ...dewormingForm, product: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.dosage")}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 1 comprimido, 1 pipeta..."
                    value={dewormingForm.dosage}
                    onChange={e => setDewormingForm({ ...dewormingForm, dosage: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("common.date")}</Label>
                    <Input
                      type="date"
                      value={dewormingForm.dateAdministered}
                      onChange={e => setDewormingForm({ ...dewormingForm, dateAdministered: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.nextDueDate")}</Label>
                    <Input
                      type="date"
                      value={dewormingForm.nextDueDate}
                      onChange={e => setDewormingForm({ ...dewormingForm, nextDueDate: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={addDewormingMutation.isPending}
                  className="w-full text-xs h-8"
                >
                  {addDewormingMutation.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── 4. TESTES DIAGNÓSTICO ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("tests")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span>{t("bulletin.testsTitle")}</span>
          </div>
          {expandedSection === "tests" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "tests" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {activeTests.length > 0 ? (
              <div className="space-y-3">
                {activeTests.map(t => (
                  <div key={t.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-none last:pb-0">
                    <div>
                      <p className="font-semibold text-foreground">{t.testName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Data: {t.datePerformed} · <span className="font-bold text-foreground">Resultado: {t.result}</span>
                      </p>
                      {t.notes && <p className="text-[10px] text-muted-foreground italic mt-1 bg-secondary/20 px-2 py-1 rounded">Nota: {t.notes}</p>}
                    </div>
                    <div className="text-right">
                      {!animal.isShared && (
                        <button
                          onClick={() => deleteTestMutation.mutate({ id: t.id, animalId })}
                          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t("bulletin.noTests")}</p>
            )}

            {!animal.isShared && (
              <Button
                onClick={() => {
                  setActiveForm(activeForm === "test" ? null : "test");
                  setTestForm({
                    testName: "",
                    datePerformed: new Date().toISOString().split("T")[0],
                    result: "",
                    notes: "",
                  });
                }}
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs h-8 rounded-xl"
              >
                <Plus size={14} /> {t("bulletin.addTest")}
              </Button>
            )}

            {activeForm === "test" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addTestMutation.mutate({
                    animalId,
                    testName: testForm.testName,
                    datePerformed: testForm.datePerformed,
                    result: testForm.result,
                    notes: testForm.notes || null,
                  });
                }}
                className="bg-secondary/40 border border-border/60 p-4 rounded-xl space-y-3 page-enter"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.testName")}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Teste Leishmaniose, Análises ao sangue..."
                    value={testForm.testName}
                    onChange={e => setTestForm({ ...testForm, testName: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("common.date")}</Label>
                    <Input
                      type="date"
                      value={testForm.datePerformed}
                      onChange={e => setTestForm({ ...testForm, datePerformed: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.result")}</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Negativo, Normal..."
                      value={testForm.result}
                      onChange={e => setTestForm({ ...testForm, result: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("common.notes")}</Label>
                  <Input
                    type="text"
                    placeholder="Observações adicionais..."
                    value={testForm.notes}
                    onChange={e => setTestForm({ ...testForm, notes: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addTestMutation.isPending}
                  className="w-full text-xs h-8"
                >
                  {addTestMutation.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── 5. OUTROS TRATAMENTOS ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("treatments")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-yellow-500" />
            <span>{t("bulletin.treatmentsTitle")}</span>
          </div>
          {expandedSection === "treatments" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "treatments" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {activeTreatments.length > 0 ? (
              <div className="space-y-3">
                {activeTreatments.map(t => (
                  <div key={t.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-none last:pb-0">
                    <div>
                      <p className="font-semibold text-foreground">{t.treatmentName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Data: {t.dateAdministered}</p>
                      {t.notes && <p className="text-[10px] text-muted-foreground italic mt-1 bg-secondary/20 px-2 py-1 rounded">Notas: {t.notes}</p>}
                    </div>
                    <div className="text-right">
                      {!animal.isShared && (
                        <button
                          onClick={() => deleteTreatmentMutation.mutate({ id: t.id, animalId })}
                          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t("bulletin.noTreatments")}</p>
            )}

            {!animal.isShared && (
              <Button
                onClick={() => {
                  setActiveForm(activeForm === "treatment" ? null : "treatment");
                  setTreatmentForm({
                    treatmentName: "",
                    dateAdministered: new Date().toISOString().split("T")[0],
                    notes: "",
                  });
                }}
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs h-8 rounded-xl"
              >
                <Plus size={14} /> {t("bulletin.addTreatment")}
              </Button>
            )}

            {activeForm === "treatment" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addTreatmentMutation.mutate({
                    animalId,
                    treatmentName: treatmentForm.treatmentName,
                    dateAdministered: treatmentForm.dateAdministered,
                    notes: treatmentForm.notes || null,
                  });
                }}
                className="bg-secondary/40 border border-border/60 p-4 rounded-xl space-y-3 page-enter"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.treatmentName")}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Cirurgia esterilização, Limpeza dentes..."
                    value={treatmentForm.treatmentName}
                    onChange={e => setTreatmentForm({ ...treatmentForm, treatmentName: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("common.date")}</Label>
                  <Input
                    type="date"
                    value={treatmentForm.dateAdministered}
                    onChange={e => setTreatmentForm({ ...treatmentForm, dateAdministered: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("common.notes")}</Label>
                  <Input
                    type="text"
                    placeholder="Instruções de pós-tratamento, dosagem medicação..."
                    value={treatmentForm.notes}
                    onChange={e => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addTreatmentMutation.isPending}
                  className="w-full text-xs h-8"
                >
                  {addTreatmentMutation.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── 6. LICENCIAMENTO MUNICIPAL ──────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("licensing")}
          className="w-full px-5 py-4 flex items-center justify-between font-semibold text-foreground text-sm hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-500" />
            <span>{t("bulletin.licensingTitle")}</span>
          </div>
          {expandedSection === "licensing" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSection === "licensing" && (
          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4">
            {activeLicenses.length > 0 ? (
              <div className="space-y-3">
                {activeLicenses.map(l => (
                  <div key={l.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-none last:pb-0">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        Nº {l.licenseNumber}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Emitido por: {l.issuingAuthority}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("common.date")}: {l.issueDate} {l.expiryDate && `· Validade: ${l.expiryDate}`}
                      </p>
                      <Badge variant="outline" className="text-[9px] mt-1 border-orange-500/20 text-orange-400 bg-orange-950/10">
                        {l.category === "companion" ? t("bulletin.catCompanion") : l.category === "dangerous" ? t("bulletin.catDangerous") : l.category === "potentially_dangerous" ? t("bulletin.catPotentiallyDangerous") : l.category === "hunting" ? t("bulletin.catHunting") : l.category === "guard" ? t("bulletin.catGuard") : t("bulletin.catOther")}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {!animal.isShared && (
                        <button
                          onClick={() => deleteLicenseMutation.mutate({ id: l.id, animalId })}
                          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t("bulletin.noLicenses")}</p>
            )}

            {!animal.isShared && (
              <Button
                onClick={() => {
                  setActiveForm(activeForm === "license" ? null : "license");
                  setLicenseForm({
                    licenseNumber: "",
                    issueDate: new Date().toISOString().split("T")[0],
                    expiryDate: "",
                    issuingAuthority: "Junta de Freguesia",
                    category: "companion",
                    notes: "",
                  });
                }}
                variant="outline"
                size="sm"
                className="w-full gap-1 text-xs h-8 rounded-xl"
              >
                <Plus size={14} /> {t("bulletin.addLicense")}
              </Button>
            )}

            {activeForm === "license" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addLicenseMutation.mutate({
                    animalId,
                    licenseNumber: licenseForm.licenseNumber,
                    issueDate: licenseForm.issueDate,
                    expiryDate: licenseForm.expiryDate || null,
                    issuingAuthority: licenseForm.issuingAuthority,
                    category: licenseForm.category,
                    notes: licenseForm.notes || null,
                  });
                }}
                className="bg-secondary/40 border border-border/60 p-4 rounded-xl space-y-3 page-enter"
              >
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.licenseNumber")}</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 1234/2026"
                    value={licenseForm.licenseNumber}
                    onChange={e => setLicenseForm({ ...licenseForm, licenseNumber: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.issuingAuthority")}</Label>
                  <Input
                    type="text"
                    placeholder="Nome da Freguesia"
                    value={licenseForm.issuingAuthority}
                    onChange={e => setLicenseForm({ ...licenseForm, issuingAuthority: e.target.value })}
                    className="text-xs h-8 bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">{t("bulletin.category")}</Label>
                  <select
                    value={licenseForm.category}
                    onChange={e => setLicenseForm({ ...licenseForm, category: e.target.value as any })}
                    className="w-full text-xs h-8 rounded-md bg-background border border-border px-2 text-foreground"
                  >
                    <option value="companion">{t("bulletin.catCompanion")}</option>
                    <option value="dangerous">{t("bulletin.catDangerous")}</option>
                    <option value="potentially_dangerous">{t("bulletin.catPotentiallyDangerous")}</option>
                    <option value="hunting">{t("bulletin.catHunting")}</option>
                    <option value="guard">{t("bulletin.catGuard")}</option>
                    <option value="other">{t("bulletin.catOther")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.issueDate")}</Label>
                    <Input
                      type="date"
                      value={licenseForm.issueDate}
                      onChange={e => setLicenseForm({ ...licenseForm, issueDate: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("bulletin.expiryDate")}</Label>
                    <Input
                      type="date"
                      value={licenseForm.expiryDate}
                      onChange={e => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })}
                      className="text-xs h-8 bg-background border-border"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={addLicenseMutation.isPending}
                  className="w-full text-xs h-8"
                >
                  {addLicenseMutation.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
