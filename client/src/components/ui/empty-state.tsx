import { motion } from "framer-motion";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.ComponentPropsWithoutRef<"div"> {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/20 backdrop-blur-xs select-none",
        className,
      )}
      {...props}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="p-4 bg-primary/10 border border-primary/20 rounded-full text-primary shadow-glow mb-2"
      >
        {icon || (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-8"
          >
            <path d="M12 13c-1.66 0-3 1.34-3 3 0 2 2 3 3 3s3-1 3-3c0-1.66-1.34-3-3-3z" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <circle cx="11.5" cy="6.5" r="1.5" />
            <circle cx="14.5" cy="6.5" r="1.5" />
            <circle cx="17.5" cy="8.5" r="1.5" />
          </svg>
        )}
      </motion.div>

      <div className="space-y-1">
        <h3 className="font-bold text-base text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="text-xs font-semibold px-4.5 py-1.5 h-8.5 rounded-lg border-border/80 hover:border-primary/40 active-scale mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
