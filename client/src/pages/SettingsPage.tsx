import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Download,
  Bell,
  Gauge,
  Info,
  User,
  Shield,
  Loader2,
  Smartphone,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Sensitivity = "low" | "medium" | "high";

const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const SENSITIVITY_DESC: Record<Sensitivity, string> = {
  low: "Apenas alertas de alta confiança (≥85%)",
  medium: "Alertas moderados (≥75%)",
  high: "Alertas frequentes (≥65%)",
};

export default function SettingsPage() {
  const { data: dbUser, refetch: refetchUser } = trpc.auth.me.useQuery();
  const { data: settingsData, isLoading: settingsLoading } = trpc.settings.get.useQuery();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [distressAlerts, setDistressAlerts] = useState(true);
  const [hungerAlerts, setHungerAlerts] = useState(true);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("medium");
  const [shareDiagnosticData, setShareDiagnosticData] = useState(true);
  const [localHistoryOnly, setLocalHistoryOnly] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const utils = trpc.useUtils();

  // Load user data
  useEffect(() => {
    if (dbUser) {
      setUserName(dbUser.name || "");
      setUserEmail(dbUser.email || "");
    }
  }, [dbUser]);

  // Load settings data
  useEffect(() => {
    if (settingsData) {
      setNotifications(settingsData.notificationsEnabled);
      setSensitivity(settingsData.alertSensitivity as Sensitivity);
    }
  }, [settingsData]);

  // Check if already installed / listen to install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check display-mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      refetchUser();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar perfil.");
    },
  });

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
    onError: () => toast.error("Erro ao guardar definições."),
  });

  const { refetch: fetchCsv, isFetching: csvLoading } = trpc.events.exportCsv.useQuery(
    undefined,
    { enabled: false }
  );

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: userName,
      email: userEmail,
    });
  };

  const handleToggleNotifications = (val: boolean) => {
    setNotifications(val);
    updateSettingsMutation.mutate({ notificationsEnabled: val });
    toast.success(`Notificações ${val ? "ativadas" : "desativadas"}`);
  };

  const handleSensitivity = (val: Sensitivity) => {
    setSensitivity(val);
    updateSettingsMutation.mutate({ alertSensitivity: val });
    toast.success(`Sensibilidade definida para: ${SENSITIVITY_LABELS[val]}`);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstalled(true);
        toast.success("Obrigado por instalar o AnimalMind!");
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 110,
        damping: 15,
      },
    },
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="page-enter min-h-full px-4 pt-6 pb-6 space-y-6 max-w-lg mx-auto"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Definições</h1>
        <p className="text-xs text-muted-foreground">
          Gerencie as suas preferências e informações pessoais do AnimalMind
        </p>
      </div>

      {/* PWA Install Banner */}
      {deferredPrompt && !isInstalled && (
        <motion.div variants={cardVariants}>
          <Card className="bg-primary/10 border-primary/20 overflow-hidden shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Smartphone className="w-4 h-4" />
                Instalar Aplicação
              </CardTitle>
              <CardDescription className="text-xs text-foreground/80 mt-0.5">
                Instale o AnimalMind no seu dispositivo móvel ou computer para acesso rápido offline e notificações nativas.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button
                onClick={handleInstallClick}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs h-9"
              >
                Instalar Agora
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* Perfil do Utilizador */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-primary" />
              Perfil do Utilizador
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Atualize o seu nome e endereço de email de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-0">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-medium text-foreground">
                  Nome Completo
                </Label>
                <Input
                  id="profile-name"
                  type="text"
                  placeholder="Nome"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-medium text-foreground">
                  Endereço de Email
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-9"
                  required
                />
              </div>
              <div className="pt-2 pb-4 border-b border-border/50">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full text-xs h-9"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    "Guardar Perfil"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notificações */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Bell className="w-4 h-4 text-primary" />
              Notificações e Alertas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Defina como e quando quer ser alertado sobre o bem-estar do seu animal
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Notificações Push</Label>
                <p className="text-[10px] text-muted-foreground">
                  Receba avisos instantâneos de comportamento
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={handleToggleNotifications}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Alertas de Angústia</Label>
                <p className="text-[10px] text-muted-foreground">
                  Apenas para detecções de choro ou ganido persistente
                </p>
              </div>
              <Switch
                checked={distressAlerts}
                onCheckedChange={setDistressAlerts}
                disabled={!notifications}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Alertas de Fome</Label>
                <p className="text-[10px] text-muted-foreground">
                  Notifique quando há probabilidade de fome elevada
                </p>
              </div>
              <Switch
                checked={hungerAlerts}
                onCheckedChange={setHungerAlerts}
                disabled={!notifications}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sensibilidade de Alertas */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Gauge className="w-4 h-4 text-primary" />
              Sensibilidade de Alertas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Ajuste o grau de confiança exigido pela Inteligência Artificial para emitir alertas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(["low", "medium", "high"] as Sensitivity[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSensitivity(s)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                  sensitivity === s
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-background/50"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    sensitivity === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground bg-transparent"
                  )}
                >
                  {sensitivity === s && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      sensitivity === s ? "text-primary" : "text-foreground"
                    )}
                  >
                    {SENSITIVITY_LABELS[s]}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {SENSITIVITY_DESC[s]}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacidade */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Shield className="w-4 h-4 text-primary" />
              Privacidade e Dados
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Escolha como os dados recolhidos pela IA são partilhados e armazenados
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 max-w-[80%]">
                <Label className="text-xs font-medium text-foreground">
                  Partilhar Dados de Diagnóstico
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Contribua para a melhoria dos nossos modelos de IA de identificação de raças e emoções enviando dados anónimos.
                </p>
              </div>
              <Switch
                checked={shareDiagnosticData}
                onCheckedChange={(val) => {
                  setShareDiagnosticData(val);
                  toast.success(
                    `Partilha de diagnóstico ${val ? "autorizada" : "desativada"}`
                  );
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5 max-w-[80%]">
                <Label className="text-xs font-medium text-foreground">
                  Histórico Local Exclusivo
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Quando ativo, evita o caching temporário das classificações na nuvem, dependendo apenas do dispositivo.
                </p>
              </div>
              <Switch
                checked={localHistoryOnly}
                onCheckedChange={(val) => {
                  setLocalHistoryOnly(val);
                  toast.success(
                    `Modo de histórico local ${val ? "ativado" : "desativado"}`
                  );
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Exportar Dados */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Download className="w-4 h-4 text-primary" />
              Exportar Histórico
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Descarregue todos os registos emocionais do seu animal
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              onClick={handleExportCsv}
              disabled={csvLoading}
              className="w-full gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {csvLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  A preparar ficheiro…
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Exportar em CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sobre a Aplicação */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Info className="w-4 h-4 text-primary" />
              Sobre a Aplicação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐾</span>
              <div>
                <p className="text-sm font-bold text-foreground">AnimalMind</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Mapeamento de inteligência emocional animal em tempo real
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
              <div className="bg-muted/50 rounded-xl p-3 border border-border/40">
                <p className="text-muted-foreground">Versão PWA</p>
                <p className="font-semibold text-foreground mt-0.5">v1.0.0 (offline enabled)</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 border border-border/40">
                <p className="text-muted-foreground">Modelos Locais</p>
                <p className="font-semibold text-foreground mt-0.5">YAMNet · YOLOv8 · ResNet</p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-2 italic">
              Desenvolvido com carinho para fortalecer a ligação com os seus animais.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
