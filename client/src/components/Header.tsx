import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

export function Header() {
  const { user, signOut, isAuthenticated } = useAuth();
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
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">AnimalMind</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-4 h-4" />
            <span className="text-sm">{user?.email}</span>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
