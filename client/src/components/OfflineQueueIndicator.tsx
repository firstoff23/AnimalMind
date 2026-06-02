import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { cn } from "@/lib/utils";
import { CloudOff, Loader2, UploadCloud } from "lucide-react";

export function OfflineQueueIndicator() {
  const { pendingCount, failedCount, isProcessing, processQueue } = useOfflineQueue();
  const hasPending = pendingCount > 0;
  const hasFailures = failedCount > 0;

  if (!hasPending && !hasFailures && !isProcessing) {
    return null;
  }

  const title = hasPending
    ? `${pendingCount} gravação(ões) offline pendentes`
    : hasFailures
    ? `${failedCount} gravação(ões) offline falharam após 3 tentativas`
    : "A sincronizar gravações offline";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => void processQueue()}
      className={cn(
        "relative border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
        !hasPending && hasFailures && "border-red-500/40 text-red-300 hover:text-red-200"
      )}
      aria-label={title}
      title={title}
      data-testid="offline-queue-indicator"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : !hasPending && hasFailures ? (
        <CloudOff className="h-4 w-4" />
      ) : (
        <UploadCloud className="h-4 w-4" />
      )}
      {hasPending && (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] leading-none"
        >
          {pendingCount}
        </Badge>
      )}
      {!hasPending && hasFailures && (
        <Badge
          variant="destructive"
          className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] leading-none"
        >
          {failedCount}
        </Badge>
      )}
    </Button>
  );
}
