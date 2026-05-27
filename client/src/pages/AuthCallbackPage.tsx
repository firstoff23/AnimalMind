import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CircleAlert, Loader2, LogIn } from "lucide-react";
import { requireSupabase } from "@/contexts/AuthContext";

type CallbackStatus = "loading" | "success" | "error";

const successMessage = "✅ Email verificado com sucesso! Já podes fazer login.";

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
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <Card className="w-full overflow-hidden border-slate-800 bg-slate-900 shadow-2xl shadow-emerald-950/20">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-lime-300" />
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-9 w-9 text-emerald-300" />
              ) : (
                <CircleAlert className="h-9 w-9 text-amber-300" />
              )}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-white">
                {isSuccess ? "Email confirmado" : isLoading ? "A verificar email" : "Link inválido"}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-slate-300">
                {message}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuccess && (
              <p className="text-center text-sm text-slate-400">
                Vamos levar-te para o login automaticamente dentro de instantes.
              </p>
            )}

            <Button
              onClick={() => setLocation("/login")}
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
