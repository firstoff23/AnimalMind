import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  AuthPasswordChecklist,
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameBlurred, setNameBlurred] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const normalizedEmail = email.trim();
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const isEmailValid = emailRegex.test(normalizedEmail);
  const isNameValid = name.trim().length > 1;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  const passwordRequirements = useMemo(
    () => [
      { label: "Mínimo 8 caracteres", met: hasMinLength },
      { label: "Uma letra maiúscula", met: hasUppercase },
      { label: "Um número", met: hasNumber },
      { label: "Um caractere especial", met: hasSpecial },
    ],
    [hasMinLength, hasNumber, hasSpecial, hasUppercase]
  );

  const nameError =
    nameBlurred && !isNameValid ? "Indique o seu nome para personalizar a conta." : "";
  const emailError =
    apiError ||
    (emailBlurred && !isEmailValid
      ? "Introduza um email válido, por exemplo nome@exemplo.com."
      : "");
  const passwordError =
    passwordBlurred && !isPasswordValid ? "Escolha uma palavra-passe que cumpra os requisitos." : "";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameBlurred(true);
    setEmailBlurred(true);
    setPasswordBlurred(true);
    setApiError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await signUp(normalizedEmail, password, name.trim());
      toast.success("Conta criada com sucesso! Verifique o email se for pedido.");
      setLocation("/login");
    } catch (error) {
      setApiError(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível criar a conta com este email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      title="Criar conta AnimalMind"
      subtitle="Comece a acompanhar o bem-estar emocional dos seus animais com uma conta segura."
      showOAuth
      footer={
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Depois do registo, poderá confirmar o email e entrar na app com as mesmas credenciais.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthTextField
          id="register-name"
          label="Nome"
          icon={authIcons.user}
          type="text"
          placeholder="Alex Inácio"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setApiError("");
          }}
          onBlur={() => setNameBlurred(true)}
          autoComplete="name"
          disabled={loading}
          error={nameError}
          success={isNameValid ? "Pronto" : undefined}
        />

        <AuthTextField
          id="register-email"
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

        <AuthTextField
          id="register-password"
          label="Palavra-passe"
          icon={authIcons.password}
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
          success={isPasswordValid ? "Segura" : undefined}
        />

        <AuthPasswordChecklist requirements={passwordRequirements} />

        <AuthSubmitButton
          loading={loading}
          loadingLabel="A criar conta..."
        >
          Criar conta
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
