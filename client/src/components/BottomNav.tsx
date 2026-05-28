import { useLocation } from "wouter";
import { Mic, PawPrint, History, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";

const NAV_ITEMS = [
  { path: "/",          icon: Mic,       key: "recording" },
  { path: "/perfil",    icon: PawPrint,  key: "profile" },
  { path: "/historico", icon: History,   key: "history" },
  { path: "/dashboard", icon: BarChart2, key: "dashboard" },
  { path: "/definicoes",icon: Settings,  key: "settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border mobile-safe-bottom">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, key }) => {
          const active = location === path;
          const label = t(`nav.${key}`);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 px-1 transition-all duration-200",
                "active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              style={{ position: "relative" }}
            >
              <Icon
                size={22}
                className={cn(
                  "transition-transform duration-200",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={cn(
                "text-[10px] font-medium leading-none transition-all duration-200",
                active ? "opacity-100" : "opacity-60"
              )}>
                {label}
              </span>
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute bottom-0 w-6 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
