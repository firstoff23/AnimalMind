import { motion } from "framer-motion";
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
      label: language === "pt" ? "Dashboard" : "Dashboard",
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
    <nav className="bottom-nav-shell mobile-safe-bottom">
      <div
        className="bottom-nav-scroll"
        aria-label={
          language === "pt" ? "Navegação principal" : "Primary navigation"
        }
      >
        {NAV_ITEMS.map(({ path, icon: Icon, label, isCenter }) => {
          const active = location === path;
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "bottom-nav-tab tap-highlight-none",
                active && "is-active",
                isCenter && "is-record",
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {/* Highlight or circle for the central record button */}
              {isCenter ? (
                <div
                  className={cn(
                    "bottom-nav-record-icon",
                    active && "is-active",
                  )}
                >
                  <Icon size={20} strokeWidth={2.0} />
                </div>
              ) : (
                <Icon
                  size={20}
                  className={cn("bottom-nav-icon", active && "is-active")}
                  strokeWidth={2.0}
                />
              )}

              <span
                className={cn(
                  "bottom-nav-label",
                  isCenter && "is-record",
                  active && "is-active",
                )}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
