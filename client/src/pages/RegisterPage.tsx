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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmailAddress } from "@/lib/disposableEmails";

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameBlurred, setNameBlurred] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [apiEmailError, setApiEmailError] = useState("");
  const [apiPasswordError, setApiPasswordError] = useState("");
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

  const emailValidationResult = validateEmailAddress(normalizedEmail);
  const isEmailValid = emailValidationResult.isValid;
  const isDisposable = emailValidationResult.errorKey === "disposable";

  const isNameValid = name.trim().length > 1;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid && ageConfirmed;

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
    apiEmailError ||
    (emailBlurred && isDisposable
      ? "Este tipo de email não é aceite. Usa o teu email pessoal ou profissional."
      : emailBlurred && !isEmailValid
        ? "Introduza um email válido, por exemplo nome@exemplo.com."
        : "");
  const passwordError =
    apiPasswordError ||
    (passwordBlurred && !isPasswordValid
      ? "Escolha uma palavra-passe que cumpra os requisitos."
      : "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameBlurred(true);
    setEmailBlurred(true);
    setPasswordBlurred(true);
    setApiEmailError("");
    setApiPasswordError("");

    if (!isFormValid) return;

    setLoading(true);
    try {
      await signUp(normalizedEmail, password, name.trim(), ageConfirmed);
      toast.success(
        "Conta criada com sucesso! Introduza o código enviado por email.",
      );
      setLocation(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (error) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível criar a conta com este email.";
      // Erros relacionados com password vão para o campo correto
      if (/password|senha|palavra.?passe/i.test(msg)) {
        setApiPasswordError(msg);
      } else {
        setApiEmailError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="register"
      title="Criar conta Pawra"
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
            setApiEmailError("");
            setApiPasswordError("");
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
            setApiEmailError("");
          }}
          onBlur={() => setEmailBlurred(true)}
          autoComplete="username"
          inputMode="email"
          disabled={loading}
          error={emailError}
          success={isEmailValid && !apiEmailError ? "Válido" : undefined}
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
            setApiPasswordError("");
          }}
          onBlur={() => setPasswordBlurred(true)}
          autoComplete="new-password"
          disabled={loading}
          error={passwordError}
          success={isPasswordValid ? "Segura" : undefined}
        />

        <AuthPasswordChecklist requirements={passwordRequirements} />

        <div className="flex items-start gap-2.5 my-2">
          <input
            id="register-age-gate"
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => {
              setAgeConfirmed(e.target.checked);
            }}
            disabled={loading}
            className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-950 accent-primary cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="register-age-gate" className="text-xs text-muted-foreground leading-snug select-none cursor-pointer">
            Confirmo que tenho 16 ou mais anos
          </label>
        </div>

        <AuthSubmitButton loading={loading} loadingLabel="A criar conta..." disabled={!ageConfirmed}>
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
          <Link
            href="/privacidade"
            className="text-primary hover:underline font-semibold"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </form>

      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Termos de Uso</DialogTitle>
            <DialogDescription>Termos de Uso — Em breve</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Os nossos termos de utilização completos serão disponibilizados em
            breve. O uso do serviço é atualmente gratuito para testes de
            bem-estar animal sob consentimento do tutor.
          </div>
          <Button onClick={() => setTermsDialogOpen(false)} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}
