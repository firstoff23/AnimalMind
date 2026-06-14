import { useLocation } from "wouter";
import { ArrowLeft, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Logo } from "@/components/ui/Logo";
import { useEffect, useState } from "react";

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  // Check if current page is one of the main tabs
  const isRootPage = ["/dashboard", "/perfil", "/capturar", "/mindi", "/alimentos", "/historico", "/definicoes"].includes(location);

  const handleBack = () => {
    if (location.startsWith("/animal/")) {
      setLocation("/perfil");
    } else if (location.startsWith("/vet/animal/")) {
      setLocation("/vet");
    } else if (location === "/vet") {
      setLocation("/dashboard");
    } else if (location === "/comparison") {
      setLocation("/historico");
    } else if (location === "/family" || location.startsWith("/join/")) {
      setLocation("/dashboard");
    } else if (location === "/gravar" || location === "/camera") {
      setLocation("/capturar");
    } else {
      window.history.back();
    }
  };

  // Compute page title dynamically
  const getPageTitle = () => {
    const translatedOr = (key: string, fallbackPt: string, fallbackEn: string) => {
      const translated = t(key);
      return translated && translated !== key ? translated : language === "pt" ? fallbackPt : fallbackEn;
    };

    if (location === "/dashboard") return "AnimalMind";
    if (location === "/perfil") return language === "pt" ? "Animais" : "Pets";
    if (location === "/capturar") return language === "pt" ? "Capturar" : "Capture";
    if (location === "/alimentos") return language === "pt" ? "Alimentos" : "Food Dictionary";
    if (location === "/historico") return language === "pt" ? "Histórico" : "History";
    if (location === "/definicoes") return language === "pt" ? "Definições" : "Settings";
    if (location === "/gravar") return language === "pt" ? "Gravar Áudio" : "Record Audio";
    if (location === "/camera") return language === "pt" ? "Câmara Visão" : "Vision Camera";
    if (location === "/mindi") return "Mindi AI Chat";
    if (location.startsWith("/animal/")) return translatedOr("animalDetail.title", "Detalhes", "Details");
    if (location.startsWith("/vet/animal/")) return "Paciente";
    if (location === "/vet") return "Modo Veterinário";
    if (location === "/comparison") return translatedOr("comparison.title", "Comparação", "Comparison");
    if (location === "/health") return translatedOr("health.title", "Saúde", "Health");
    if (location === "/family" || location.startsWith("/join/")) {
      return translatedOr("dashboardPage.family", "Modo Família", "Family Mode");
    }
    return "AnimalMind";
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 px-4 py-3 h-14 flex items-center justify-between select-none">
      {/* Left side actions (Back Button) */}
      <div className="flex items-center w-1/4">
        {!isRootPage && (
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground active-scale tap-highlight-none -ml-2 h-9 w-9"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Centered Title */}
      <div className="flex-1 flex items-center justify-center gap-1.5 font-bold text-base text-foreground tracking-tight font-satoshi">
        {isRootPage && <Logo className="text-primary size-5" />}
        <span>{getPageTitle()}</span>
        {!isOnline && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/25 uppercase tracking-wider shrink-0 animate-pulse" title="Modo Offline">
            <WifiOff className="h-2.5 w-2.5" />
            Offline
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center justify-end gap-1.5 w-1/4">
        <OfflineQueueIndicator />
      </div>
    </header>
  );
}
