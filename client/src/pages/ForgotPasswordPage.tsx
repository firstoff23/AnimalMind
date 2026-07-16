import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AuthInlineNote,
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { requireSupabase, useAuth } from "@/contexts/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const normalizedEmail = email.trim();
  const isEmailValid = emailRegex.test(normalizedEmail);
  const emailError =
    apiError ||
    (emailBlurred && !isEmailValid
      ? "Introduza o email associado à sua conta Pawra."
      : "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailBlurred(true);
    setApiError("");

    if (!isEmailValid) return;

    setLoading(true);
    try {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) throw error;

      setSent(true);
      toast.success("Email de recuperação enviado.");
    } catch {
      setApiError(
        "Não foi possível enviar o link para este email. Confirme o endereço e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? "Verifique o email" : "Recuperar palavra-passe"}
      subtitle={
        sent
          ? "Enviámos as instruções para a sua caixa de entrada."
          : "Receba um link seguro para definir uma nova palavra-passe."
      }
      eyebrow="Acesso seguro"
      compact
      footer={
        <div className="text-center">
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Voltar ao login
          </button>
        </div>
      }
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthTextField
            id="forgot-email"
            label="Email"
            icon={authIcons.email}
            type="email"
            placeholder="alex@exemplo.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setApiError("");
            }}
            onBlur={() => setEmailBlurred(true)}
            autoComplete="username"
            inputMode="email"
            disabled={loading}
            error={emailError}
            success={isEmailValid && !apiError ? "Válido" : undefined}
          />

          <AuthSubmitButton loading={loading} loadingLabel="A enviar...">
            Enviar link de recuperação
          </AuthSubmitButton>
        </form>
      ) : (
        <div className="space-y-4">
          <AuthInlineNote
            icon={MailCheck}
            tone="success"
            title="Link enviado"
            description={
              <>
                Enviámos um link de recuperação para{" "}
                <strong>{normalizedEmail}</strong>. Verifique também a pasta de
                spam.
              </>
            }
          />
          <Button
            type="button"
            onClick={() => setLocation("/login")}
            className="h-11 w-full rounded-2xl text-sm font-semibold"
          >
            Voltar ao login
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
