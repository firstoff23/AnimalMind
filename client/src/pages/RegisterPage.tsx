import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import {
  AuthPasswordChecklist,
  AuthShell,
  AuthSubmitButton,
  AuthTextField,
  authIcons,
} from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

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
  const isPasswordValid =
    hasMinLength && hasUppercase && hasNumber && hasSpecial;
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
    [hasMinLength, hasNumber, hasSpecial, hasUppercase],
  );

  const nameError =
    nameBlurred && !isNameValid
      ? "Indique o seu nome para personalizar a conta."
      : "";
  const emailError =
    apiError ||
    (emailBlurred && !isEmailValid
      ? "Introduza um email válido, por exemplo nome@exemplo.com."
      : "");
  const passwordError =
    passwordBlurred && !isPasswordValid
      ? "Escolha uma palavra-passe que cumpra os requisitos."
      : "";

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
      toast.success(
        "Conta criada com sucesso! Verifique o email se for pedido.",
      );
      setLocation("/login");
    } catch (error) {
      setApiError(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível criar a conta com este email.",
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
          Depois do registo, poderá confirmar o email e entrar na app com as
          mesmas credenciais.
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

        <AuthSubmitButton loading={loading} loadingLabel="A criar conta...">
          Criar conta
        </AuthSubmitButton>
        <p className="text-center text-[10px] sm:text-xs leading-relaxed text-muted-foreground mt-4">
          Ao criar conta, aceitas os nossos{" "}
          <button
            type="button"
            onClick={() => setTermsDialogOpen(true)}
            className="text-primary hover:underline font-semibold"
          >
            Termos de Uso
          </button>{" "}
          e a nossa{" "}
          <Link href="/privacidade" className="text-primary hover:underline font-semibold">
            Política de Privacidade
          </Link>
          .
        </p>
      </form>

      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Termos de Uso</DialogTitle>
            <DialogDescription>
              Termos de Uso — Em breve
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Os nossos termos de utilização completos serão disponibilizados em breve. O uso do serviço é atualmente gratuito para testes de bem-estar animal sob consentimento do tutor.
          </div>
          <Button onClick={() => setTermsDialogOpen(false)} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}
