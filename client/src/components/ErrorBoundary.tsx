/**
 * ErrorBoundary — Self-healing React error boundary for AnimalMind
 *
 * Features:
 * - Auto-retry the failed subtree up to MAX_AUTO_RETRIES times
 * - Persist the error to the server via SelfHealingContext (if available)
 * - Provide a polished UI for user-facing crashes
 * - Show different messages for network vs render errors
 */
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** Optional label shown in the error UI (e.g. "Recording module") */
  label?: string;
  /** Override auto-retry max attempts (default: 2) */
  maxRetries?: number;
  /** Optional callback — fires after every caught error */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_AUTO_RETRIES = 2;

function isNetworkError(err: Error | null): boolean {
  if (!err) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("503") ||
    msg.includes("timeout")
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<Props, State> {
  private autoRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });

    // Fire optional callback (used by SelfHealingProvider wrapper)
    this.props.onError?.(error, info);

    // Auto-retry for transient errors
    const maxRetries = this.props.maxRetries ?? MAX_AUTO_RETRIES;
    if (this.state.retryCount < maxRetries) {
      const delay = 1500 * (this.state.retryCount + 1); // 1.5s, 3s …
      console.warn(
        `[ErrorBoundary] Auto-retry ${this.state.retryCount + 1}/${maxRetries} in ${delay}ms for:`,
        error.message
      );
      this.autoRetryTimer = setTimeout(() => this.handleRetry(), delay);
    }
  }

  componentWillUnmount() {
    if (this.autoRetryTimer) clearTimeout(this.autoRetryTimer);
  }

  handleRetry = () => {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const maxRetries = this.props.maxRetries ?? MAX_AUTO_RETRIES;
    const canRetry = this.state.retryCount < maxRetries;
    const isNetwork = isNetworkError(error);
    const label = this.props.label ?? "módulo";

    return (
      <div className="flex items-center justify-center min-h-[200px] p-8 bg-background">
        <div
          className={cn(
            "flex flex-col items-center w-full max-w-lg p-8 rounded-2xl border",
            "bg-card/50 backdrop-blur-sm border-border/60",
            "animate-in fade-in-0 zoom-in-95 duration-300"
          )}
          role="alert"
          aria-live="assertive"
        >
          {/* Icon */}
          <div className="mb-5 p-4 rounded-full bg-destructive/10 border border-destructive/20">
            {isNetwork ? (
              <WifiOff size={32} className="text-destructive" />
            ) : (
              <AlertTriangle size={32} className="text-destructive" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground mb-2 text-center">
            {isNetwork ? "Sem ligação" : `Erro no ${label}`}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground text-center mb-1">
            {isNetwork
              ? "Não foi possível contactar o servidor. Verifica a tua ligação e tenta novamente."
              : "Ocorreu um problema inesperado. A app está a tentar recuperar automaticamente."}
          </p>

          {/* Retry indicator */}
          {canRetry && (
            <p className="text-xs text-muted-foreground/60 mb-5 text-center">
              A tentar recuperar… (tentativa {this.state.retryCount + 1}/{maxRetries})
            </p>
          )}

          {/* Error detail (condensed, collapsed by default) */}
          {error && (
            <details className="w-full mb-5">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                Detalhes do erro
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/40 overflow-auto max-h-40">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                  {error.message}
                </pre>
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              id="error-boundary-retry-btn"
              onClick={this.handleRetry}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              )}
            >
              <RefreshCw size={14} />
              Tentar novamente
            </button>

            <button
              id="error-boundary-reload-btn"
              onClick={() => window.location.reload()}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium",
                "bg-muted text-muted-foreground border border-border/60",
                "hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
              )}
            >
              Recarregar app
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

// ─── HOC helper ──────────────────────────────────────────────────────────────
/**
 * Wraps a component in an ErrorBoundary.
 * Useful for lazy-loaded page boundaries.
 */
export function withErrorBoundary<P extends object>(
  Wrapped: React.ComponentType<P>,
  options?: { label?: string; maxRetries?: number }
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary label={options?.label} maxRetries={options?.maxRetries}>
        <Wrapped {...props} />
      </ErrorBoundary>
    );
  };
}
