import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FallbackProps } from "react-error-boundary";

export function GlobalFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isNetwork = errorMessage.toLowerCase().includes("network") || 
                    errorMessage.toLowerCase().includes("fetch");

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background">
      <div
        className={cn(
          "flex flex-col items-center w-full max-w-lg p-8 rounded-2xl border",
          "bg-card/50 backdrop-blur-sm border-border/60",
          "animate-in fade-in-0 zoom-in-95 duration-300",
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="mb-5 p-4 rounded-full bg-destructive/10 border border-destructive/20">
          <AlertTriangle size={32} className="text-destructive" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-2 text-center">
          {isNetwork ? "Sem ligação" : "Ocorreu um erro inesperado"}
        </h2>

        <p className="text-sm text-muted-foreground text-center mb-5">
          {isNetwork
            ? "Não foi possível contactar o servidor. Verifica a tua ligação e tenta novamente."
            : "Pedimos desculpa pelo incómodo. Por favor tenta recarregar a página."}
        </p>

        {!!error && (
          <details className="w-full mb-5">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              Detalhes do erro
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/40 overflow-auto max-h-40">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                {errorMessage}
              </pre>
            </div>
          </details>
        )}

        <div className="flex gap-3 w-full">
          <button
             onClick={resetErrorBoundary}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
              "bg-primary text-primary-foreground",
              "hover:opacity-90 active:scale-95 transition-all cursor-pointer",
            )}
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
