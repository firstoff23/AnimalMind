import { KeyRound, Link2Off } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AuthInlineNote,
  AuthPasswordChecklist,
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { requireSupabase } from "@/contexts/AuthContext";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") !== "recovery") {
      setValidToken(false);
    }
  }, []);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const isConfirmPasswordValid =
    confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = isPasswordValid && isConfirmPasswordValid;

  const passwordRequirements = useMemo(
    () => [
      { label: "Mínimo 8 caracteres", met: hasMinLength },
      { label: "Uma letra maiúscula", met: hasUppercase },
      { label: "Um número", met: hasNumber },
      { label: "Um caractere especial", met: hasSpecial },
    ],
    [hasMinLength, hasNumber, hasSpecial, hasUppercase],
  );

  const passwordError =
    apiError ||
    (passwordBlurred && !isPasswordValid
      ? "A nova palavra-passe tem de cumprir todos os requisitos."
      : "");
  const confirmPasswordError =
    confirmPasswordBlurred && !isConfirmPasswordValid
      ? confirmPassword.length === 0
        ? "Confirme a nova palavra-passe."
        : "As palavras-passe não coincidem."
      : "";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordBlurred(true);
    setConfirmPasswordBlurred(true);
    setApiError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      const { error } = await requireSupabase().auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success("Palavra-passe alterada com sucesso!");
      setLocation("/login");
    } catch (error) {
      setApiError(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível alterar a palavra-passe. Peça um novo link se necessário.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <AuthShell
        title="Link inválido"
        subtitle="O link de recuperação expirou ou não contém os dados necessários."
        eyebrow="Recuperação de conta"
        compact
      >
        <div className="space-y-4">
          <AuthInlineNote
            icon={Link2Off}
            tone="warning"
            title="Não foi possível validar o link"
            description="Peça um novo link de recuperação e abra-o no mesmo browser onde pretende definir a palavra-passe."
          />
          <Button
            type="button"
            onClick={() => setLocation("/forgot-password")}
            className="h-11 w-full rounded-2xl text-sm font-semibold"
          >
            Solicitar novo link
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Definir nova palavra-passe"
      subtitle="Escolha uma palavra-passe forte para proteger o acesso ao Pawra."
      eyebrow="Recuperação de conta"
      compact
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          id="reset-password"
          label="Nova palavra-passe"
          icon={KeyRound}
          type="password"
          placeholder="Crie uma palavra-passe forte"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setApiError("");
          }}
          onBlur={() => setPasswordBlurred(true)}
          autoComplete="new-password"
          disabled={loading}
          error={passwordError}
          success={isPasswordValid && !apiError ? "Segura" : undefined}
        />

        <AuthPasswordChecklist requirements={passwordRequirements} />

        <AuthTextField
          id="reset-confirm-password"
          label="Confirmar palavra-passe"
          icon={authIcons.password}
          type="password"
          placeholder="Repita a nova palavra-passe"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setApiError("");
          }}
          onBlur={() => setConfirmPasswordBlurred(true)}
          autoComplete="new-password"
          disabled={loading}
          error={confirmPasswordError}
          success={isConfirmPasswordValid ? "Coincide" : undefined}
        />

        <AuthSubmitButton loading={loading} loadingLabel="A alterar...">
          Alterar palavra-passe
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
