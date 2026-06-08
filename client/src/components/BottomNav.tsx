import { useLocation } from "wouter";
import { Mic, PawPrint, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { language } = useLanguage();

  const NAV_ITEMS = [
    { path: "/dashboard",    icon: BarChart2, label: language === "pt" ? "Dashboard" : "Dashboard" },
    { path: "/gravar",       icon: Mic,        label: language === "pt" ? "Gravar" : "Record", isCenter: true },
    { path: "/perfil",       icon: PawPrint,   label: language === "pt" ? "Animais" : "Pets" },
    { path: "/user-profile", icon: User,       label: language === "pt" ? "Perfil" : "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border/80 mobile-safe-bottom select-none">
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-2 h-16">
        {NAV_ITEMS.map(({ path, icon: Icon, label, isCenter }) => {
          const active = location === path;
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 px-0.5 transition-colors duration-200 relative tap-highlight-none",
                isCenter 
                  ? "text-primary" 
                  : active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {/* Highlight or circle for the central record button */}
              {isCenter ? (
                <div className={cn(
                  "p-2.5 rounded-full -mt-5 shadow-lg border transition-all duration-300 active:scale-95",
                  active 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-slate-900 border-border text-primary hover:text-primary-foreground hover:bg-primary"
                )}>
                  <Icon size={20} strokeWidth={2.5} />
                </div>
              ) : (
                <Icon
                  size={20}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-110 text-primary"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              )}

              <span className={cn(
                "text-[9px] font-semibold leading-none tracking-wide transition-all duration-200 mt-0.5",
                isCenter ? "-mt-0.5" : "",
                active ? "opacity-100 font-bold" : "opacity-60"
              )}>
                {label}
              </span>

              {/* Slider Indicator under active items (except central action button) */}
              {!isCenter && active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute bottom-1 w-5 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
