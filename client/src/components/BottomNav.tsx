import { motion } from "motion/react";
import {
  Apple,
  BarChart2,
  Camera,
  History,
  MessageCircle,
  PawPrint,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { language } = useLanguage();

  const NAV_ITEMS = [
    {
      path: "/dashboard",
      icon: BarChart2,
      label: "Dashboard",
    },
    {
      path: "/perfil",
      icon: PawPrint,
      label: language === "pt" ? "Animais" : "Pets",
    },
    {
      path: "/capturar",
      icon: Camera,
      label: language === "pt" ? "Capturar" : "Capture",
      isCenter: true,
    },
    { path: "/mindi", icon: MessageCircle, label: "Mindi" },
    {
      path: "/alimentos",
      icon: Apple,
      label: language === "pt" ? "Alimentos" : "Foods",
    },
    {
      path: "/historico",
      icon: History,
      label: language === "pt" ? "Histórico" : "History",
    },
    {
      path: "/definicoes",
      icon: Settings,
      label: language === "pt" ? "Definições" : "Settings",
    },
  ];

  return (
    <nav
      className="fixed bottom-6 inset-x-4 z-50 md:hidden flex justify-center pointer-events-none"
      aria-label={
        language === "pt" ? "Navegação principal" : "Primary navigation"
      }
    >
      <div className="bg-card/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl shadow-2xl px-2 py-2 flex items-center justify-between w-full max-w-md pointer-events-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label, isCenter }) => {
          const active = location === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 px-1 focus:outline-none transition-colors tap-highlight-none",
                active
                  ? "text-teal-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {/* Sliding Active Bubble background (using layoutId for interpolation) */}
              {active && !isCenter && (
                <motion.div
                  layoutId="activeTabBubble"
                  className="absolute inset-0 bg-teal-500/10 rounded-2xl z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {isCenter ? (
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300",
                    active
                      ? "bg-teal-500 border-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 scale-105"
                      : "bg-secondary border-border/80 text-foreground hover:border-teal-500/30",
                  )}
                >
                  <Icon size={18} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <Icon
                    size={18}
                    className="transition-transform duration-200"
                    strokeWidth={active ? 2.5 : 2.0}
                  />
                  {/* Active tab label showing with fade-in and scale animation */}
                  <div className="overflow-hidden h-3 flex items-center mt-0.5">
                    {active ? (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[9px] font-bold tracking-tight block"
                      >
                        {label}
                      </motion.span>
                    ) : (
                      <span className="text-[9px] font-medium opacity-0 block h-0">
                        {label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
