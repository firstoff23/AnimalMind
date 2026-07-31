import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const normalizedEmail = email.trim();
  const isEmailValid = emailRegex.test(normalizedEmail);
  const isPasswordValid = password.length > 0;
  const isFormValid = isEmailValid && isPasswordValid;

  const emailError =
    emailBlurred && !isEmailValid
      ? "Introduza um email válido, por exemplo nome@exemplo.com."
      : "";
  const passwordError =
    apiError ||
    (passwordBlurred && !isPasswordValid
      ? "Introduza a palavra-passe da sua conta."
      : "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailBlurred(true);
    setPasswordBlurred(true);
    setApiError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await signIn(normalizedEmail, password);
      toast.success("Bem-vindo de volta!");
      setLocation("/dashboard");
    } catch {
      setApiError(
        "Email ou palavra-passe incorretos. Verifique os dados e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="login"
      title="Entrar no PeloNaRoupa"
      subtitle="Aceda ao histórico, gravações e perfil dos seus animais com uma sessão segura."
      showOAuth
      footer={
        <div className="space-y-3 text-center text-sm">
          <button
            type="button"
            onClick={() => setLocation("/forgot-password")}
            className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Esqueceu a palavra-passe?
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ao continuar, mantém o mesmo acesso seguro usado em toda a app.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          id="login-email"
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
          success={isEmailValid ? "Válido" : undefined}
        />

        <AuthTextField
          id="login-password"
          label="Palavra-passe"
          icon={authIcons.password}
          type="password"
          placeholder="A sua palavra-passe"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setApiError("");
          }}
          onBlur={() => setPasswordBlurred(true)}
          autoComplete="current-password"
          disabled={loading}
          error={passwordError}
          success={isPasswordValid && !apiError ? "Preenchida" : undefined}
        />

        <AuthSubmitButton loading={loading} loadingLabel="A entrar...">
          Entrar
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
