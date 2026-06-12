import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "vaul";
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
  Check,
  Sun,
  Moon,
  LogOut,
  Stethoscope,
  Activity,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Wrench,
  RefreshCw,
  Camera,
  PawPrint,
  FileText,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getVeterinaryRoleLabel, isVeterinaryRole } from "@/lib/roles";
import { useSelfHealing } from "@/contexts/SelfHealingContext";

type Sensitivity = "low" | "medium" | "high";

function CrashingComponent(): null {
  throw new Error("Erro Simulado de UI: Falha crítica na renderização do componente de teste.");
}

function SettingsSectionLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1 pt-2">
      <p className="text-xs font-semibold uppercase text-primary">{title}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  const { signOut } = useAuth();
  const { data: dbUser, refetch: refetchUser } = trpc.auth.me.useQuery();
  const { data: settingsData, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const canAccessVetMode = isVeterinaryRole(dbUser?.role);
  const veterinaryRoleLabel = getVeterinaryRoleLabel(dbUser?.role);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [distressAlerts, setDistressAlerts] = useState(true);
  const [hungerAlerts, setHungerAlerts] = useState(true);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("medium");
  const [shareDiagnosticData, setShareDiagnosticData] = useState(true);
  const [localHistoryOnly, setLocalHistoryOnly] = useState(false);

  // Diagnostics and errors state

  const utils = trpc.useUtils();
  const { reportError } = useSelfHealing();
  const [shouldCrash, setShouldCrash] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);

  const { data: recentErrors, refetch: refetchErrors } = trpc.healing.getRecentErrors.useQuery({ limit: 5 });
  const { data: healingHistory, refetch: refetchHealing } = trpc.healing.getHealingHistory.useQuery({ limit: 5 });
  const { data: healthState, refetch: refetchHealth } = trpc.healing.getHealthState.useQuery();

  const clearHistoryMutation = trpc.healing.clearHistory.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Logs de diagnóstico limpos!" : "Diagnostic logs cleared!");
      refetchErrors();
      refetchHealing();
      refetchHealth();
    },
    onError: (err) => {
      toast.error(err.message || (language === "pt" ? "Erro ao limpar logs." : "Error clearing logs."));
    },
  });

  const sensitivityLabels: Record<Sensitivity, string> = {
    low: t("settingsPage.alertsSensitivityLow"),
    medium: t("settingsPage.alertsSensitivityMedium"),
    high: t("settingsPage.alertsSensitivityHigh"),
  };

  const sensitivityDescs: Record<Sensitivity, string> = {
    low: language === "pt" ? "Apenas alertas de alta confiança (≥85%)" : "Only high confidence alerts (≥85%)",
    medium: language === "pt" ? "Alertas moderados (≥75%)" : "Moderate alerts (≥75%)",
    high: language === "pt" ? "Alertas frequentes (≥65%)" : "Frequent alerts (≥65%)",
  };

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

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(language === "pt" ? "Perfil atualizado com sucesso!" : "Profile updated successfully!");
      refetchUser();
    },
    onError: (err) => {
      toast.error(err.message || (language === "pt" ? "Erro ao atualizar perfil." : "Error updating profile."));
    },
  });

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
    onError: () => toast.error(language === "pt" ? "Erro ao guardar definições." : "Error saving settings."),
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
      toast.success(language === "pt" ? "CSV exportado com sucesso!" : "CSV exported successfully!");
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
    toast.success(
      language === "pt"
        ? `Notificações ${val ? "ativadas" : "desativadas"}`
        : `Notifications ${val ? "enabled" : "disabled"}`
    );
  };

  const handleSensitivity = (val: Sensitivity) => {
    setSensitivity(val);
    updateSettingsMutation.mutate({ alertSensitivity: val });
    toast.success(
      language === "pt"
        ? `Sensibilidade definida para: ${sensitivityLabels[val]}`
        : `Sensitivity set to: ${sensitivityLabels[val]}`
    );
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
    return <AppShellSkeleton mode="content" variant="settings" />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="page-enter min-h-full px-4 pt-6 pb-6 space-y-6 max-w-lg mx-auto"
    >
      {shouldCrash && <CrashingComponent />}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("settingsPage.title")}</h1>
        <p className="text-xs text-muted-foreground">
          {language === "pt"
            ? "Gerencie as suas preferências e informações pessoais do AnimalMind"
            : "Manage your preferences and personal information for AnimalMind"}
        </p>
      </div>

      {/* Modo Veterinário */}
      {canAccessVetMode && (
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-cyan-500/10">
            <CardHeader className="pb-3 border-b border-emerald-500/10 bg-emerald-500/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                {language === "pt" ? "Modo Veterinário" : "Veterinary Mode"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {language === "pt"
                  ? `Entrada profissional ativa para ${veterinaryRoleLabel.toLowerCase()}.`
                  : `Professional access enabled for ${veterinaryRoleLabel.toLowerCase()}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                {language === "pt"
                  ? "Acompanhe animais partilhados por tutores, consulte relatórios e registe notas clínicas internas."
                  : "Track animals shared by guardians, review reports, and save internal clinical notes."}
              </p>
              <Button
                onClick={() => setLocation("/vet")}
                className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs h-9 active-scale tap-highlight-none"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                {language === "pt" ? "Abrir Modo Veterinário" : "Open Veterinary Mode"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}



      <SettingsSectionLabel
        title={language === "pt" ? "Conta" : "Account"}
        description={language === "pt" ? "Dados pessoais, idioma e aparência da app." : "Personal data, language and app appearance."}
      />

      {/* Perfil do Utilizador */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-primary" />
              {t("profilePage.title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt" ? "Atualize o seu nome e endereço de email de contacto" : "Update your name and contact email address"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-0">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-medium text-foreground">
                  {language === "pt" ? "Nome Completo" : "Full Name"}
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
                  {language === "pt" ? "Endereço de Email" : "Email Address"}
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
                  className="w-full text-xs h-9 active-scale tap-highlight-none"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    language === "pt" ? "Guardar Perfil" : "Save Profile"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Idioma */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <span className="w-4 h-4 text-center text-xs flex items-center justify-center font-bold text-primary">🌐</span>
              {t("settingsPage.language")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt" ? "Escolha o idioma preferido para a interface" : "Choose the preferred language for the interface"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex gap-4">
            <Button
              variant={language === "pt" ? "default" : "outline"}
              onClick={() => {
                setLanguage("pt");
                toast.success("Idioma alterado para Português");
              }}
              className="flex-1 text-xs h-9 font-semibold active-scale tap-highlight-none"
            >
              Português (PT)
            </Button>
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => {
                setLanguage("en");
                toast.success("Language changed to English");
              }}
              className="flex-1 text-xs h-9 font-semibold active-scale tap-highlight-none"
            >
              English (EN)
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tema */}
      {switchable && toggleTheme && (
        <motion.div variants={cardVariants}>
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                {language === "pt" ? "Tema Visual" : "Visual Theme"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {language === "pt" ? "Selecione o esquema de cores da aplicação" : "Select the application's color scheme"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex gap-4">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => {
                  if (theme === "dark") toggleTheme();
                }}
                className="flex-1 text-xs h-9 font-semibold gap-2 active-scale tap-highlight-none"
              >
                <Sun className="w-3.5 h-3.5" />
                {language === "pt" ? "Claro" : "Light"}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => {
                  if (theme === "light") toggleTheme();
                }}
                className="flex-1 text-xs h-9 font-semibold gap-2 active-scale tap-highlight-none"
              >
                <Moon className="w-3.5 h-3.5" />
                {language === "pt" ? "Escuro" : "Dark"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <SettingsSectionLabel
        title={language === "pt" ? "Alertas" : "Alerts"}
        description={language === "pt" ? "Preferências de notificação e sensibilidade clínica." : "Notification preferences and clinical sensitivity."}
      />

      {/* Notificações */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Bell className="w-4 h-4 text-primary" />
              {language === "pt" ? "Notificações e Alertas" : "Notifications & Alerts"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt" ? "Defina como e quando quer ser alertado sobre o bem-estar do seu animal" : "Define how and when you want to be alerted about your animal's well-being"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">{t("settingsPage.notifications")}</Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt" ? "Receba avisos instantâneos de comportamento" : "Receive instant behavior alerts"}
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
                <Label className="text-xs font-medium text-foreground">{language === "pt" ? "Alertas de Angústia" : "Distress Alerts"}</Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt" ? "Apenas para detecções de choro ou ganido persistente" : "Only for detections of persistent crying or whining"}
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
                <Label className="text-xs font-medium text-foreground">{language === "pt" ? "Alertas de Fome" : "Hunger Alerts"}</Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt" ? "Notifique quando há probabilidade de fome elevada" : "Notify when hunger probability is high"}
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
              {t("settingsPage.alertsSensitivity")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt"
                ? "Ajuste o grau de confiança exigido pela Inteligência Artificial para emitir alertas"
                : "Adjust the confidence level required by Artificial Intelligence to trigger alerts"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(["low", "medium", "high"] as Sensitivity[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSensitivity(s)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left active-scale tap-highlight-none",
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
                    {sensitivityLabels[s]}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sensitivityDescs[s]}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <SettingsSectionLabel
        title={language === "pt" ? "Privacidade" : "Privacy"}
        description={language === "pt" ? "Controle de dados, histórico local e diagnóstico técnico." : "Data controls, local history and technical diagnostics."}
      />

      {/* Privacidade */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Shield className="w-4 h-4 text-primary" />
              {language === "pt" ? "Privacidade e Dados" : "Privacy & Data"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt" ? "Escolha como os dados recolhidos pela IA são partilhados e armazenados" : "Choose how data collected by AI is shared and stored"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 max-w-[80%]">
                <Label className="text-xs font-medium text-foreground">
                  {language === "pt" ? "Partilhar Dados de Diagnóstico" : "Share Diagnostic Data"}
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt"
                    ? "Contribua para a melhoria dos nossos modelos de IA de identificação de raças e emoções enviando dados anónimos."
                    : "Contribute to improving our breed and emotion AI models by sending anonymous data."}
                </p>
              </div>
              <Switch
                checked={shareDiagnosticData}
                onCheckedChange={(val) => {
                  setShareDiagnosticData(val);
                  toast.success(
                    language === "pt"
                      ? `Partilha de diagnóstico ${val ? "autorizada" : "desativada"}`
                      : `Diagnostic sharing ${val ? "authorized" : "disabled"}`
                  );
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5 max-w-[80%]">
                <Label className="text-xs font-medium text-foreground">
                  {language === "pt" ? "Histórico Local Exclusivo" : "Exclusive Local History"}
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {language === "pt"
                    ? "Quando ativo, evita o caching temporário das classificações na nuvem, dependendo apenas do dispositivo."
                    : "When active, prevents temporary cloud caching of classifications, relying only on the device."}
                </p>
              </div>
              <Switch
                checked={localHistoryOnly}
                onCheckedChange={(val) => {
                  setLocalHistoryOnly(val);
                  toast.success(
                    language === "pt"
                      ? `Modo de histórico local ${val ? "ativado" : "desativado"}`
                      : `Local history mode ${val ? "enabled" : "disabled"}`
                  );
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Diagnóstico e Autocura */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              {language === "pt" ? "Diagnóstico e Autocura" : "Diagnostics & Self-Healing"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt"
                ? "Monitorize a saúde do sistema e teste a recuperação automática da app"
                : "Monitor system health and test automatic app recovery"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* Health Status Dashboard */}
            <div className="bg-muted/35 border border-border/40 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {language === "pt" ? "Estado de Saúde Geral:" : "Overall Health State:"}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex items-center gap-1.5",
                  healthState?.status === "healthy" || !healthState
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : healthState?.status === "degraded"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full animate-ping",
                    healthState?.status === "healthy" || !healthState
                      ? "bg-emerald-400"
                      : healthState?.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  )} />
                  {healthState?.status || "healthy"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="border border-border/30 rounded-lg p-2 bg-background/50 flex flex-col justify-between">
                  <span className="text-muted-foreground">API Backend:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Operational
                  </span>
                </div>
                <div className="border border-border/30 rounded-lg p-2 bg-background/50 flex flex-col justify-between">
                  <span className="text-muted-foreground">Camera System:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
                <div className="border border-border/30 rounded-lg p-2 bg-background/50 flex flex-col justify-between">
                  <span className="text-muted-foreground">Audio / YAMNet:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Online
                  </span>
                </div>
                <div className="border border-border/30 rounded-lg p-2 bg-background/50 flex flex-col justify-between">
                  <span className="text-muted-foreground">Last Checked:</span>
                  <span className="font-semibold text-foreground mt-0.5">
                    {healthState ? new Date(healthState.lastCheckedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Error Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                {language === "pt" ? "Testar Autocura (Simulação)" : "Test Self-Healing (Simulation)"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    toast.loading(language === "pt" ? "A simular erro de interface..." : "Simulating UI error...");
                    setTimeout(() => setShouldCrash(true), 850);
                  }}
                  variant="outline"
                  className="text-[10px] h-8 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 gap-1 active-scale"
                >
                  <AlertCircle className="w-3 h-3" />
                  {language === "pt" ? "Erro de UI (Crash)" : "UI Error (Crash)"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    reportError(new Error("Simulated API Error: Failed to fetch backend at fly.dev (Status 503)"));
                    toast.success(language === "pt" ? "Erro de rede simulado e enviado!" : "Simulated network error logged!");
                    setTimeout(() => {
                      refetchErrors();
                      refetchHealth();
                    }, 500);
                  }}
                  variant="outline"
                  className="text-[10px] h-8 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 gap-1 active-scale"
                >
                  <RefreshCw className="w-3 h-3" />
                  {language === "pt" ? "Erro de Rede" : "Network Error"}
                </Button>
              </div>
            </div>

            {/* Recent Errors List */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{language === "pt" ? "Erros Recentes Intercetados" : "Recent Intercepted Errors"}</span>
                <span className="text-[10px] text-muted-foreground font-normal font-sans">
                  {recentErrors?.length ?? 0} {language === "pt" ? "registados" : "logged"}
                </span>
              </Label>

              {recentErrors && recentErrors.length > 0 ? (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {recentErrors.map((err: any) => (
                    <div
                      key={err.id}
                      className="border border-border/40 rounded-lg p-2 bg-background/30 text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate max-w-[150px]">
                          [{err.component}] {err.errorCode}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-md font-bold capitalize text-[8px]",
                          err.severity === "critical"
                            ? "bg-rose-500/10 text-rose-400"
                            : err.severity === "error"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        )}>
                          {err.severity}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-1 break-all text-[9px]">{err.errorMessage}</p>
                      <div className="flex items-center justify-between text-[8px] text-muted-foreground/80 pt-0.5">
                        <span>{new Date(err.createdAt).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedErrorId(expandedErrorId === err.id ? null : err.id)}
                          className="text-primary hover:underline"
                        >
                          {expandedErrorId === err.id
                            ? (language === "pt" ? "Fechar" : "Close")
                            : (language === "pt" ? "Ver Detalhes" : "View Details")}
                        </button>
                      </div>
                      {expandedErrorId === err.id && (
                        <div className="mt-1.5 p-1.5 bg-background border border-border/20 rounded-md overflow-x-auto">
                          <pre className="text-[8px] font-mono leading-tight whitespace-pre-wrap break-all text-muted-foreground/90">
                            {err.errorStack || err.errorMessage}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center text-muted-foreground py-5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-[10px] font-medium">{language === "pt" ? "Nenhum erro detetado recente" : "No recent errors detected"}</span>
                </div>
              )}
            </div>

            {/* Healing History Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                {language === "pt" ? "Histórico de Ações de Autocura" : "Self-Healing Actions History"}
              </Label>
              {healingHistory && healingHistory.length > 0 ? (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {healingHistory.map((act: any) => (
                    <div
                      key={act.id}
                      className="border border-border/30 rounded-lg p-2 bg-background/30 text-[10px] flex items-start gap-2"
                    >
                      <Wrench className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground capitalize">
                            {act.actionAttempted.replace(/_/g, " ")}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-md font-bold capitalize text-[8px]",
                            act.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          )}>
                            {act.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-snug text-[9px]">{act.resolutionNotes}</p>
                        <span className="text-[8px] text-muted-foreground/80 block pt-0.5">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center text-muted-foreground py-4">
                  <Wrench className="w-5 h-5 text-muted-foreground/60 mb-1" />
                  <span className="text-[10px]">{language === "pt" ? "Nenhuma ação corretiva executada ainda" : "No corrective actions executed yet"}</span>
                </div>
              )}
            </div>
          </CardContent>

          {/* Admin Clean Actions */}
          {dbUser?.role === "admin" && (
            <CardFooter className="pt-0 border-t border-border/10 bg-muted/10 p-3">
              <Button
                type="button"
                onClick={() => {
                  if (confirm(language === "pt" ? "Tem a certeza que deseja apagar todos os logs de autocura?" : "Are you sure you want to delete all self-healing logs?")) {
                    clearHistoryMutation.mutate({ olderThanDays: 0 });
                  }
                }}
                disabled={clearHistoryMutation.isPending}
                variant="destructive"
                className="w-full gap-2 text-xs h-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active-scale"
              >
                {clearHistoryMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {language === "pt" ? "Limpar Logs de Autocura (Admin)" : "Clear Self-Healing Logs (Admin)"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </motion.div>

      {/* Exportar Dados */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Download className="w-4 h-4 text-primary" />
              {t("settingsPage.exportData")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {t("settingsPage.exportDataDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              onClick={handleExportCsv}
              disabled={csvLoading}
              className="w-full gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 active-scale tap-highlight-none"
            >
              {csvLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {language === "pt" ? "A preparar ficheiro…" : "Preparing file…"}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {t("settingsPage.exportDataBtn")}
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
              {t("settingsPage.about")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-muted/30 border border-border/30">
              <Logo className="w-12 h-12 text-primary" />
              <p className="text-lg font-bold text-foreground mt-2 tracking-tight">AnimalMind</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                {language === "pt"
                  ? "Análise avançada e monitorização do bem-estar e inteligência emocional animal."
                  : "Advanced analysis and monitoring of animal well-being and emotional intelligence."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/40 rounded-xl p-3 border border-border/40">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("settingsPage.version")}</p>
                <p className="font-semibold text-foreground mt-1">v1.0.0 (offline-ready)</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3 border border-border/40">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{language === "pt" ? "Modelos Locais" : "Local Models"}</p>
                <p className="font-semibold text-foreground mt-1">YAMNet · YOLOv8 · ResNet</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-foreground px-1 mb-1">
                {language === "pt" ? "Documentos e Políticas" : "Documents & Policies"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/privacidade")}
                  className="h-9 rounded-xl border-border/60 hover:bg-muted text-xs justify-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Shield size={14} className="text-primary" />
                  {language === "pt" ? "Privacidade" : "Privacidade"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/privacidade")}
                  className="h-9 rounded-xl border-border/60 hover:bg-muted text-xs justify-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <FileText size={14} className="text-indigo-400" />
                  {language === "pt" ? "Termos de Uso" : "Terms of Use"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessão / Logout */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground text-destructive">
              <LogOut className="w-4 h-4 text-destructive" />
              {language === "pt" ? "Sessão" : "Session"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "pt"
                ? "Termine a sessão no seu dispositivo atual"
                : "Sign out of your account on this device"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await signOut();
                  toast.success(
                    language === "pt"
                      ? "Sessão terminada com sucesso."
                      : "Signed out successfully."
                  );
                  setLocation("/login");
                } catch (err: any) {
                  toast.error(err.message || "Erro ao sair");
                }
              }}
              className="w-full gap-2 text-xs h-9 font-semibold active-scale tap-highlight-none"
            >
              <LogOut className="w-3.5 h-3.5" />
              {language === "pt" ? "Terminar Sessão" : "Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
