import * as React from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Search, PawPrint, Mic, Heart, GitCompare } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data: animals = [] } = trpc.animals.list.useQuery(undefined, { enabled: isAuthenticated });

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const navigateTo = (path: string) => {
    setLocation(path);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Overlay to close */}
      <div className="fixed inset-0" onClick={() => onOpenChange(false)} />

      <Command className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[450px]">
        <div className="flex items-center border-b border-border px-3 py-2.5">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
          <Command.Input
            placeholder={t("commandPalette.placeholder") || "Pesquisar ou executar ação..."}
            className="flex h-10 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            autoFocus
          />
        </div>

        <Command.List className="overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {t("commandPalette.empty") || "Nenhum resultado encontrado."}
          </Command.Empty>

          <Command.Group heading={t("commandPalette.actions") || "Ações Rápidas"} className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            <Command.Item
              onSelect={() => navigateTo("/")}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-secondary cursor-pointer"
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
              <span>{t("commandPalette.newRecording") || "Nova gravação"}</span>
            </Command.Item>
            <Command.Item
              onSelect={() => navigateTo("/health")}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-secondary cursor-pointer"
            >
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span>{t("commandPalette.openBulletin") || "Abrir Boletim"}</span>
            </Command.Item>
            <Command.Item
              onSelect={() => navigateTo("/comparison")}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-secondary cursor-pointer"
            >
              <GitCompare className="h-4 w-4 text-muted-foreground" />
              <span>{t("commandPalette.compareAnimals") || "Comparar animais"}</span>
            </Command.Item>
          </Command.Group>

          {animals.length > 0 && (
            <>
              <div className="h-px bg-border my-1.5" />
              <Command.Group heading={t("commandPalette.animals") || "Animais"} className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                {animals.map((animal) => (
                  <Command.Item
                    key={animal.id}
                    value={animal.name}
                    onSelect={() => navigateTo(`/animal/${animal.id}`)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <span className="text-base">{animal.species === "dog" ? "🐕" : "🐈"}</span>
                    <span className="flex-1 truncate">{animal.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{animal.breed || "—"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
