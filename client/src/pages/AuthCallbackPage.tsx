import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, CircleAlert, Loader2, LogIn } from "lucide-react";
import { requireSupabase } from "@/contexts/AuthContext";
import { AuthInlineNote, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

type CallbackStatus = "loading" | "success" | "error";

const successMessage = "Email verificado com sucesso! Já podes fazer login.";

function readCallbackParams() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    code: query.get("code"),
    tokenHash: query.get("token_hash") || hash.get("token_hash"),
    type: query.get("type") || hash.get("type") || "signup",
    accessToken: hash.get("access_token") || query.get("access_token"),
    refreshToken: hash.get("refresh_token") || query.get("refresh_token"),
    error: query.get("error") || hash.get("error"),
    errorDescription:
      query.get("error_description") || hash.get("error_description") || query.get("error_code"),
  };
}

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("A confirmar o teu email...");

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const confirmEmail = async () => {
      try {
        const supabase = requireSupabase();
        const params = readCallbackParams();

        if (params.error) {
          throw new Error(params.errorDescription || "O link de confirmação não é válido.");
        }

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.accessToken && params.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (error) throw error;
        } else if (params.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: params.type,
          });
          if (error) throw error;
        } else {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;
          if (!session) {
            throw new Error("Não encontrámos dados de confirmação neste link.");
          }
        }

        await supabase.auth.signOut();
        setStatus("success");
        setMessage(successMessage);
        window.history.replaceState({}, document.title, "/auth/callback");
        redirectTimer = setTimeout(() => setLocation("/login"), 3000);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Não foi possível confirmar o email.");
      }
    };

    confirmEmail();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [setLocation]);

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <AuthShell
      title={isSuccess ? "Email confirmado" : isLoading ? "A verificar email" : "Link inválido"}
      subtitle={
        isSuccess
          ? "A confirmação foi concluída dentro da experiência AnimalMind."
          : isLoading
            ? "Estamos a validar o link de confirmação em segurança."
            : "Não conseguimos validar este link."
      }
      eyebrow="Confirmação segura"
      compact
    >
      <div className="space-y-4">
        <AuthInlineNote
          icon={isLoading ? Loader2 : isSuccess ? CheckCircle2 : CircleAlert}
          tone={isSuccess ? "success" : isLoading ? "neutral" : "warning"}
          title={isSuccess ? "Verificação concluída" : isLoading ? "A confirmar sessão" : "Confirmação falhou"}
          description={message}
        />

        {isSuccess && (
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Vamos levar-te para o login automaticamente dentro de instantes.
          </p>
        )}

        <Button
          type="button"
          onClick={() => setLocation("/login")}
          disabled={isLoading}
          className="h-11 w-full rounded-2xl text-sm font-semibold"
        >
          <LogIn size={16} />
          Ir para login
        </Button>
      </div>
    </AuthShell>
  );
}
