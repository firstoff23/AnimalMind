import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AppShellSkeletonVariant =
  | "dashboard"
  | "profile"
  | "history"
  | "detail"
  | "settings"
  | "comparison"
  | "health"
  | "family"
  | "vet"
  | "content";

type AppShellSkeletonProps = {
  mode?: "shell" | "content";
  variant?: AppShellSkeletonVariant;
  className?: string;
};

type PageFrameProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
};

const cardClass = "rounded-2xl border border-border bg-card/80 p-4";

function PageFrame({ children, className, maxWidth = "max-w-lg" }: PageFrameProps) {
  return (
    <div className={cn("page-enter mx-auto flex w-full flex-col gap-5 px-4 py-6", maxWidth, className)}>
      {children}
    </div>
  );
}

function HeaderSkeleton({
  title = "w-44",
  subtitle = "w-64",
  actions = 0,
}: {
  title?: string;
  subtitle?: string;
  actions?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className={cn("h-7 rounded-lg", title)} />
        <Skeleton className={cn("h-3 max-w-full rounded-lg", subtitle)} />
      </div>
      {actions > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-9 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricGridSkeleton({ columns = 2 }: { columns?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid gap-3", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3", columns === 4 && "grid-cols-2 md:grid-cols-4")}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className={cardClass}>
          <Skeleton className="mb-3 h-4 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="mt-3 h-3 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-3 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32 rounded-lg" />
              <Skeleton className="h-2.5 w-44 max-w-full rounded-lg" />
            </div>
            <Skeleton className="h-4 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <Skeleton className={cn("w-full rounded-xl", tall ? "h-72" : "h-44")} />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-14 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded-lg" />
        <Skeleton className="h-3 w-14 rounded-lg" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageFrame>
      <HeaderSkeleton title="w-40" subtitle="w-56" />
      <Skeleton className="h-14 rounded-2xl" />
      <MetricGridSkeleton columns={2} />
      <ChartCardSkeleton />
      <ListCardSkeleton rows={3} />
    </PageFrame>
  );
}

function ProfileSkeleton() {
  return (
    <PageFrame>
      <HeaderSkeleton title="w-32" subtitle="w-44" actions={1} />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="w-36 shrink-0 rounded-2xl border border-border bg-card/80 p-4">
            <Skeleton className="mb-3 h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="mt-2 h-3 w-24 rounded-lg" />
            <Skeleton className="mt-4 h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <ChartCardSkeleton />
      <ListCardSkeleton rows={4} />
    </PageFrame>
  );
}

function HistorySkeleton() {
  return (
    <PageFrame>
      <HeaderSkeleton title="w-36" subtitle="w-48" actions={2} />
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/40 p-1">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 p-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1 rounded-lg" />
      </div>
      <ListCardSkeleton rows={6} />
    </PageFrame>
  );
}

function DetailSkeleton() {
  return (
    <PageFrame maxWidth="max-w-xl" className="pb-20">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className={cn(cardClass, "flex items-center justify-between gap-4")}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-44 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <MetricGridSkeleton columns={3} />
      <ChartCardSkeleton tall />
      <ListCardSkeleton rows={5} />
    </PageFrame>
  );
}

function SettingsSkeleton() {
  return (
    <PageFrame>
      <HeaderSkeleton title="w-36" subtitle="w-72" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cardClass}>
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-lg" />
              <Skeleton className="h-3 w-56 rounded-lg" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </PageFrame>
  );
}

function ComparisonSkeleton() {
  return (
    <PageFrame maxWidth="max-w-2xl">
      <HeaderSkeleton title="w-64" subtitle="w-72" />
      <div className={cardClass}>
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
      <ChartCardSkeleton tall />
      <ChartCardSkeleton tall />
    </PageFrame>
  );
}

function HealthSkeleton() {
  return (
    <PageFrame maxWidth="max-w-2xl">
      <HeaderSkeleton title="w-56" subtitle="w-64" actions={1} />
      <div className={cn(cardClass, "flex items-center gap-3")}>
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-3 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className={cardClass}>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-9 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </PageFrame>
  );
}

function FamilySkeleton() {
  return (
    <PageFrame maxWidth="max-w-6xl">
      <HeaderSkeleton title="w-56" subtitle="w-96" actions={1} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <Skeleton className="mb-3 h-4 w-28 rounded-lg" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
        <div className={cardClass}>
          <Skeleton className="mb-3 h-4 w-32 rounded-lg" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <ListCardSkeleton rows={4} />
        <ListCardSkeleton rows={4} />
        <ListCardSkeleton rows={4} />
      </div>
    </PageFrame>
  );
}

function VetSkeleton() {
  return (
    <PageFrame maxWidth="max-w-7xl">
      <HeaderSkeleton title="w-56" subtitle="w-96" actions={1} />
      <div className="grid gap-3 rounded-lg border border-border bg-card/70 p-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ListCardSkeleton rows={5} />
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <MetricGridSkeleton columns={3} />
          <div className="mt-4">
            <ChartCardSkeleton tall />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function GenericContentSkeleton() {
  return (
    <PageFrame maxWidth="max-w-5xl">
      <HeaderSkeleton />
      <MetricGridSkeleton columns={3} />
      <ListCardSkeleton rows={4} />
    </PageFrame>
  );
}

function ContentSkeleton({ variant = "dashboard", className }: { variant?: AppShellSkeletonVariant; className?: string }) {
  return (
    <div className={className}>
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "profile" && <ProfileSkeleton />}
      {variant === "history" && <HistorySkeleton />}
      {variant === "detail" && <DetailSkeleton />}
      {variant === "settings" && <SettingsSkeleton />}
      {variant === "comparison" && <ComparisonSkeleton />}
      {variant === "health" && <HealthSkeleton />}
      {variant === "family" && <FamilySkeleton />}
      {variant === "vet" && <VetSkeleton />}
      {variant === "content" && <GenericContentSkeleton />}
    </div>
  );
}

export function AppShellSkeleton({ mode = "shell", variant = "dashboard", className }: AppShellSkeletonProps) {
  if (mode === "content") {
    return <ContentSkeleton variant={variant} className={className} />;
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-4 w-40 rounded-lg sm:block" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </header>

      <main className="pb-24">
        <ContentSkeleton variant={variant} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-3">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </nav>
    </div>
  );
}
