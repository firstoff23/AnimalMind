import { motion } from "framer-motion";
import type React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SpotlightCard({
  children,
  className,
  onClick,
  ...props
}: SpotlightCardProps) {
  const isInteractive = !!onClick;

  return (
    <motion.div
      whileTap={isInteractive ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-border bg-card p-5 overflow-hidden transition-all duration-300 tap-highlight-none",
        isInteractive &&
          "active:border-primary/40 active:ring-2 active:ring-primary/10 select-none cursor-pointer",
        className,
      )}
      {...(props as any)}
    >
      {/* Dynamic glow overlay only visible in active state to simulate touch pressure */}
      {isInteractive && (
        <div className="absolute inset-0 bg-primary/5 opacity-0 active:opacity-100 transition-opacity duration-150 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
