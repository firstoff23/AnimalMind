import * as React from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { Logo } from "@/components/ui/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  Mic,
  PawPrint,
  History,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { language } = useLanguage();
  const { signOut } = useAuth();
  const { data: dbUser } = trpc.auth.me.useQuery();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: "/dashboard", icon: BarChart2, label: language === "pt" ? "Dashboard" : "Dashboard" },
    { path: "/gravar", icon: Mic, label: language === "pt" ? "Gravar" : "Record" },
    { path: "/perfil", icon: PawPrint, label: language === "pt" ? "Animais" : "Pets" },
    { path: "/historico", icon: History, label: language === "pt" ? "Histórico" : "History" },
    { path: "/mindi", icon: MessageCircle, label: "Mindi" },
    { path: "/definicoes", icon: Settings, label: language === "pt" ? "Definições" : "Settings" },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(language === "pt" ? "Sessão terminada." : "Signed out.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Error signing out");
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="hidden md:flex flex-col h-screen bg-card border-r border-border/40 select-none flex-shrink-0 relative"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <Logo className="text-primary size-7 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-satoshi font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent truncate"
              >
                AnimalMind
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        {/* Toggle Collapse Button */}
        <Button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          variant="ghost"
          size="icon"
          className="size-8 absolute -right-4 top-4 bg-card border border-border/50 rounded-full hover:bg-muted/80 z-50 text-muted-foreground shadow-sm shadow-black/30 hover:text-primary active-scale"
          aria-label={
            collapsed
              ? language === "pt"
                ? "Expandir navegação"
                : "Expand navigation"
              : language === "pt"
                ? "Recolher navegação"
                : "Collapse navigation"
          }
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] text-left active-scale font-satoshi text-xs font-semibold relative overflow-hidden group",
                active
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  active ? "text-primary scale-110" : "group-hover:scale-105"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* User profile bottom bar */}
      <div className="p-3 border-t border-border/40 bg-muted/20 flex flex-col gap-2">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "px-1.5")}>
          <Avatar className="size-8.5 border border-border/50 shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground" />
          </Avatar>
          
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[11px] font-bold text-foreground truncate leading-none">
                  {dbUser?.name || "Tutor"}
                </p>
                <p className="text-[9px] text-muted-foreground truncate mt-0.5 leading-none">
                  {dbUser?.email || "tutor@animalmind.app"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <Button
              type="button"
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-rose-400 active-scale"
              title={language === "pt" ? "Sair" : "Sign Out"}
              aria-label={language === "pt" ? "Terminar sessão" : "Sign out"}
            >
              <LogOut size={14} />
            </Button>
          )}
        </div>

        {collapsed && (
          <Button
            type="button"
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="w-full h-8 text-muted-foreground hover:text-rose-400 active-scale mt-1"
            title={language === "pt" ? "Sair" : "Sign Out"}
            aria-label={language === "pt" ? "Terminar sessão" : "Sign out"}
          >
            <LogOut size={14} />
          </Button>
        )}
      </div>
    </motion.aside>
  );
}
