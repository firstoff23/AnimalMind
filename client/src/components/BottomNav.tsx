import { useLocation } from "wouter";
import { Mic, PawPrint, BarChart2, User, Apple, History, MessageCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { language } = useLanguage();

  const NAV_ITEMS = [
    { path: "/dashboard",    icon: BarChart2, label: language === "pt" ? "Dashboard" : "Dashboard" },
    { path: "/alimentos",    icon: Apple,     label: language === "pt" ? "Alimentos" : "Foods" },
    { path: "/gravar",       icon: Mic,        label: language === "pt" ? "Gravar" : "Record", isCenter: true },
    { path: "/perfil",       icon: PawPrint,   label: language === "pt" ? "Animais" : "Pets" },
    { path: "/historico",    icon: History,    label: language === "pt" ? "Histórico" : "History" },
    { path: "/mindi",        icon: MessageCircle, label: "Mindi" },
    { path: "/user-profile", icon: User,       label: language === "pt" ? "Perfil" : "Profile" },
    { path: "/definicoes",   icon: Settings,   label: language === "pt" ? "Definições" : "Settings" },
  ];

  return (
    <nav className="bottom-nav-shell mobile-safe-bottom">
      <div className="bottom-nav-scroll" aria-label={language === "pt" ? "Navegação principal" : "Primary navigation"}>
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
                isCenter && "is-record"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {/* Highlight or circle for the central record button */}
              {isCenter ? (
                <div className={cn(
                  "bottom-nav-record-icon",
                  active && "is-active"
                )}>
                  <Icon size={20} strokeWidth={2.5} />
                </div>
              ) : (
                <Icon
                  size={20}
                  className={cn(
                    "bottom-nav-icon",
                    active && "is-active"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              )}

              <span className={cn(
                "bottom-nav-label",
                isCenter && "is-record",
                active && "is-active"
              )}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
