import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Bell, Gauge, Info } from "lucide-react";
import { toast } from "sonner";

type Sensitivity = "low" | "medium" | "high";

const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  low:    "Baixa",
  medium: "Média",
  high:   "Alta",
};

const SENSITIVITY_DESC: Record<Sensitivity, string> = {
  low:    "Apenas alertas de alta confiança (≥85%)",
  medium: "Alertas moderados (≥75%)",
  high:   "Alertas frequentes (≥65%)",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: settingsData, isLoading } = trpc.settings.get.useQuery();
  const [notifications, setNotifications] = useState(true);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("medium");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (settingsData) {
      setNotifications(settingsData.notificationsEnabled);
      setSensitivity(settingsData.alertSensitivity as Sensitivity);
    }
  }, [settingsData]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Definições guardadas.");
    },
    onError: () => toast.error("Erro ao guardar definições."),
  });

  const { data: csvData, refetch: fetchCsv, isFetching: csvLoading } =
    trpc.events.exportCsv.useQuery(undefined, { enabled: false });

  const handleExportCsv = async () => {
    const result = await fetchCsv();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `animalmind-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado com sucesso!");
    }
  };

  const handleToggleNotifications = (val: boolean) => {
    setNotifications(val);
    updateMutation.mutate({ notificationsEnabled: val });
  };

  const handleSensitivity = (val: Sensitivity) => {
    setSensitivity(val);
    updateMutation.mutate({ alertSensitivity: val });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter min-h-full px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground">Definições</h1>

      {/* Notifications */}
      <Section icon={Bell} title="Notificações">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Notificações push
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alertas para estados críticos (angústia e fome)
            </p>
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={handleToggleNotifications}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </Section>

      {/* Alert sensitivity */}
      <Section icon={Gauge} title="Sensibilidade de Alertas">
        <p className="text-xs text-muted-foreground mb-3">
          Define o limiar de confiança para enviar notificações
        </p>
        <div className="space-y-2">
          {(["low", "medium", "high"] as Sensitivity[]).map((s) => (
            <button
              key={s}
              onClick={() => handleSensitivity(s)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                sensitivity === s
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                  sensitivity === s
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    sensitivity === s ? "text-primary" : "text-foreground"
                  )}
                >
                  {SENSITIVITY_LABELS[s]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SENSITIVITY_DESC[s]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Export */}
      <Section icon={Download} title="Exportar Dados">
        <p className="text-xs text-muted-foreground mb-3">
          Exporta todo o histórico de classificações em formato CSV
        </p>
        <Button
          onClick={handleExportCsv}
          disabled={csvLoading}
          className="w-full gap-2 bg-primary text-primary-foreground"
        >
          <Download size={16} />
          {csvLoading ? "A preparar…" : "Exportar CSV"}
        </Button>
      </Section>

      {/* About */}
      <Section icon={Info} title="Sobre">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐾</span>
            <div>
              <p className="font-bold text-foreground">AnimalMind</p>
              <p className="text-xs text-muted-foreground">
                Sistema inteligente de análise emocional animal
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-muted-foreground">Versão</p>
              <p className="font-semibold text-foreground">0.1.0</p>
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-muted-foreground">Modelos</p>
              <p className="font-semibold text-foreground">YAMNet · Wav2Vec2 · Gemini</p>
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-muted-foreground">Estados</p>
              <p className="font-semibold text-foreground">6 emoções</p>
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-muted-foreground">Espécies</p>
              <p className="font-semibold text-foreground">🐕 Cão · 🐈 Gato</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">
            Desenvolvido com ❤️ para os seus animais
          </p>
        </div>
      </Section>
    </div>
  );
}
