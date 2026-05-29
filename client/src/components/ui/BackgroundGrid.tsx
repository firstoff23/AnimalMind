import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BackgroundGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,oklch(0.22_0.012_264_/_0.35)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.22_0.012_264_/_0.35)_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 50%, transparent 100%)",
        }}
      />
      {/* Animated glowing spotlights in the background */}
      <motion.div
        animate={{
          x: [0, 80, -80, 0],
          y: [0, -50, 50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -60, 60, 0],
          y: [0, 60, -60, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] right-[10%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px]"
      />
    </div>
  );
}
