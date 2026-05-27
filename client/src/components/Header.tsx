import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";

export function Header() {
  const { user, signOut, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Desconectado com sucesso");
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
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
