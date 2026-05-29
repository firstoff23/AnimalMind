import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlowingButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  glowColor?: string;
  active?: boolean;
}

export const GlowingButton = React.forwardRef<HTMLButtonElement, GlowingButtonProps>(
  ({ children, className, glowColor = "#10b981", active = false, ...props }, ref) => {
    return (
      <div className="relative shrink-0">
        {/* Glow backdrop layer */}
        <motion.div
          animate={active ? { scale: [0.95, 1.08, 0.95], opacity: [0.5, 0.8, 0.5] } : { scale: 1, opacity: 0.4 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="absolute -inset-2 rounded-full blur-xl pointer-events-none transition-all duration-500"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
        <motion.button
          ref={ref as any}
          className={cn(
            "relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2",
            "font-semibold shadow-2xl transition-all duration-300",
            "active:scale-95 disabled:cursor-not-allowed text-white",
            className
          )}
          {...props}
        >
          {children}
        </motion.button>
      </div>
    );
  }
);
GlowingButton.displayName = "GlowingButton";
