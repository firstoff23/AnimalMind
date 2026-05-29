import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, User, Search } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { useAppStore } from "@/store/appStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Header() {
  const { user, signOut, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t("header.logoutSuccess") !== "header.logoutSuccess" ? t("header.logoutSuccess") : "Desconectado com sucesso");
      setLocation("/login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao desconectar");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">AnimalMind</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="text-sm">{user?.email}</span>
          </div>

          <Button
            onClick={() => setCommandPaletteOpen(true)}
            variant="outline"
            size="icon"
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Abrir pesquisa"
            title="Pesquisar (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </Button>

          <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("header.logout")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Terminar sessão</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Tem a certeza que deseja terminar a sua sessão? Terá de introduzir as suas credenciais novamente para aceder ao AnimalMind.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-slate-700 hover:bg-slate-800 text-white">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Terminar Sessão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
