import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  type LucideIcon,
  Mail,
  PawPrint,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  type InputHTMLAttributes,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  mode?: AuthMode;
  eyebrow?: string;
  footer?: ReactNode;
  compact?: boolean;
  showOAuth?: boolean;
};

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string;
  success?: string;
};

type PasswordRequirement = {
  label: string;
  met: boolean;
};

const modeConfig = {
  login: {
    label: "Entrar",
    href: "/login",
    description: "Aceder à sua conta",
  },
  register: {
    label: "Criar conta",
    href: "/register",
    description: "Começar no Pawra",
  },
} satisfies Record<
  AuthMode,
  { label: string; href: string; description: string }
>;

function isOAuthConfigured() {
  return Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID,
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  mode,
  eyebrow = "Bem-estar animal inteligente",
  footer,
  compact = false,
  showOAuth = false,
}: AuthShellProps) {
  const [, setLocation] = useLocation();
  const oauthEnabled = showOAuth && isOAuthConfigured();

  const handleOAuth = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="relative isolate flex min-h-dvh flex-col bg-[linear-gradient(150deg,oklch(0.09_0.012_264)_0%,oklch(0.11_0.014_250)_42%,oklch(0.16_0.045_64)_100%)]">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:linear-gradient(180deg,rgba(255,255,255,0.08)_0,transparent_38%),radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.24),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[linear-gradient(0deg,rgba(244,180,89,0.16),transparent)]" />

        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-white shadow-sm backdrop-blur transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Voltar à página inicial do Pawra"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-emerald-950/30">
              <PawPrint size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold leading-none">
                Pawra
              </span>
              <span className="mt-1 block text-[10px] font-medium uppercase text-emerald-100/70">
                acesso seguro
              </span>
            </span>
          </button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setLocation("/")}
            className="h-9 rounded-xl px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            Início
          </Button>
        </header>

        <section className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-6 px-4 pb-8 pt-2 md:grid-cols-[0.92fr_1.08fr] md:pb-12">
          <aside className="hidden md:block">
            <div className="max-w-sm animate-fade-in space-y-5 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-200/10 px-3 py-1 text-[11px] font-semibold uppercase text-orange-100">
                <Sparkles size={13} />
                Acesso premium
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold leading-tight">
                  Uma entrada mais calma para cuidar melhor.
                </h1>
                <p className="text-sm leading-6 text-white/68">
                  Uma experiência escura, quente e táctil, alinhada com o
                  cuidado diário dos seus animais.
                </p>
              </div>
              <div className="grid gap-3 text-xs text-white/72">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <p className="font-semibold text-white">Sessão segura</p>
                  <p className="mt-1">
                    Email, palavra-passe e recuperação ficam num fluxo único e
                    protegido.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.075] p-4 backdrop-blur">
                  <p className="font-semibold text-white">Nativo no Pawra</p>
                  <p className="mt-1">
                    Componentes, espaçamento e estados seguem a linguagem
                    mobile-first da app.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className={cn("mx-auto w-full max-w-md", compact && "max-w-sm")}>
            <div className="animate-slide-up rounded-[1.65rem] border border-white/10 bg-white/[0.055] p-1 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="rounded-[1.45rem] border border-white/10 bg-card/95 p-4 shadow-inner shadow-white/5 sm:p-5">
                <div className="mb-5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase text-primary">
                      {eyebrow}
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">
                      {title}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {subtitle}
                    </p>
                  </div>

                  {mode && <AuthModeTabs activeMode={mode} />}
                </div>

                <div className="animate-fade-in">{children}</div>

                {oauthEnabled && (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        ou
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOAuth}
                      className="h-11 w-full rounded-2xl border-border bg-secondary/50 text-sm font-semibold"
                    >
                      <Sparkles size={16} />
                      Continuar com portal Pawra
                    </Button>
                  </div>
                )}

                {footer && <div className="mt-5">{footer}</div>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthModeTabs({ activeMode }: { activeMode: AuthMode }) {
  const [, setLocation] = useLocation();

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/60 p-1"
      role="tablist"
      aria-label="Escolha entre entrar ou criar conta"
    >
      {(Object.keys(modeConfig) as AuthMode[]).map((mode) => {
        const active = activeMode === mode;
        const config = modeConfig[mode];
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setLocation(config.href)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active-scale",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block text-xs font-bold">{config.label}</span>
            <span className="mt-0.5 block text-[10px] leading-tight opacity-75">
              {config.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AuthTextField({
  id,
  label,
  icon: Icon,
  error,
  success,
  type,
  className,
  disabled,
  ...props
}: AuthTextFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && passwordVisible ? "text" : type;
  const describedBy = error
    ? `${id}-error`
    : success
      ? `${id}-success`
      : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-semibold text-foreground">
          {label}
        </Label>
        {success && !error && (
          <span
            id={`${id}-success`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            <Check size={12} />
            {success}
          </span>
        )}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
              error && "text-destructive",
              success && !error && "text-primary",
            )}
          />
        )}
        <Input
          id={id}
          type={inputType}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            "h-12 rounded-2xl border-border bg-background/75 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/65 focus-visible:ring-primary/30",
            Icon && "pl-10",
            isPassword && "pr-11",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25",
            success &&
              !error &&
              "border-primary/50 focus-visible:border-primary",
            disabled && "opacity-70",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            disabled={disabled}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
            aria-label={
              passwordVisible
                ? "Ocultar palavra-passe"
                : "Mostrar palavra-passe"
            }
          >
            {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-xs font-medium leading-relaxed text-destructive"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function AuthSubmitButton({
  children,
  loading,
  loadingLabel,
  disabled,
}: {
  children: ReactNode;
  loading: boolean;
  loadingLabel: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary via-emerald-400 to-orange-300 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/25 transition-transform hover:brightness-105 active:scale-[0.985] disabled:brightness-75"
    >
      {loading ? (
        <>
          <Loader2 size={17} className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function AuthPasswordChecklist({
  requirements,
}: {
  requirements: PasswordRequirement[];
}) {
  const complete = useMemo(
    () => requirements.filter((requirement) => requirement.met).length,
    [requirements],
  );

  return (
    <div className="rounded-2xl border border-border bg-secondary/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">
          Segurança da palavra-passe
        </p>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {complete}/{requirements.length}
        </span>
      </div>
      <div className="grid gap-1.5">
        {requirements.map((requirement) => (
          <div
            key={requirement.label}
            className={cn(
              "flex items-center gap-2 text-[11px] font-medium transition-colors",
              requirement.met ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                requirement.met
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background",
              )}
              aria-hidden="true"
            >
              {requirement.met ? <Check size={10} /> : ""}
            </span>
            <span>{requirement.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthInlineNote({
  icon: Icon = Mail,
  title,
  description,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  title: string;
  description: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "success" && "border-primary/25 bg-primary/10 text-primary",
        tone === "warning" &&
          "border-orange-400/25 bg-orange-400/10 text-orange-200",
        tone === "neutral" && "border-border bg-secondary/45 text-foreground",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-background/30">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <div className="mt-1 text-xs leading-relaxed opacity-78">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

export const authIcons = {
  email: Mail,
  password: LockKeyhole,
  user: UserRound,
};
