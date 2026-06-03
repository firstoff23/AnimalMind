import { useLocation } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

export function Header() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  if (!isAuthenticated) {
    return null;
  }

  // Check if current page is one of the main tabs
  const isRootPage = ["/dashboard", "/gravar", "/historico", "/perfil", "/definicoes"].includes(location);

  const handleBack = () => {
    if (location.startsWith("/animal/")) {
      setLocation("/perfil");
    } else if (location === "/comparison") {
      setLocation("/historico");
    } else if (location === "/family" || location.startsWith("/join/")) {
      setLocation("/dashboard");
    } else {
      window.history.back();
    }
  };

  // Compute page title dynamically
  const getPageTitle = () => {
    if (isRootPage) return "AnimalMind";
    if (location.startsWith("/animal/")) return t("animalDetail.title") || "Detalhes";
    if (location === "/comparison") return t("comparison.title") || "Comparação";
    if (location === "/health") return t("health.title") || "Saúde";
    if (location === "/family" || location.startsWith("/join/")) return t("dashboardPage.family") || "Modo Família";
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
      <div className="flex-1 text-center font-bold text-base text-foreground tracking-tight">
        {getPageTitle()}
      </div>

      {/* Right side actions (Offline indicator, Search) */}
      <div className="flex items-center justify-end gap-1.5 w-1/4">
        <OfflineQueueIndicator />
        {isRootPage && (
          <Button
            onClick={() => setCommandPaletteOpen(true)}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground active-scale tap-highlight-none h-9 w-9"
            aria-label="Abrir pesquisa"
            title="Pesquisar (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
