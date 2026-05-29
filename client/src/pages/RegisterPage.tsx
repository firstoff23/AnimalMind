import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";

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
  const [shake, setShake] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Real-time password requirement checklist
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const isNameValid = name.trim().length > 0;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  const nameError = nameBlurred && !isNameValid
    ? "O nome está em branco. É necessário indicar o seu nome para podermos personalizar a sua conta. Introduza o seu nome ou apelido no campo."
    : "";

  const emailError = emailBlurred && !isEmailValid
    ? "Este email não é válido. O formato do endereço de email está incorreto. Verifica se escreveste corretamente (ex: nome@exemplo.com)."
    : "";

  const passwordError = passwordBlurred && !isPasswordValid
    ? "A palavra-passe não cumpre todos os requisitos de segurança obrigatórios. Escolha uma palavra-passe mais forte para proteger a sua conta."
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    setApiError("");

    try {
      await signUp(email, password, name);
      toast.success("Conta criada com sucesso! Faça login agora.");
      setLocation("/login");
    } catch (error: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setApiError(
        error.message ||
        "Não foi possível registar a sua conta. Este endereço de email poderá já estar registado no nosso sistema. Tente fazer login ou use um endereço de email diferente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md bg-slate-900 border-slate-800 transition-transform ${shake ? "animate-shake" : ""}`}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">AnimalMind</CardTitle>
          <CardDescription className="text-slate-400">
            Crie uma nova conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex gap-2 text-xs leading-relaxed animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Nome</label>
                {isNameValid && (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Válido
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setApiError("");
                  }}
                  onBlur={() => setNameBlurred(true)}
                  required
                  disabled={loading}
                  className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10 ${
                    nameError ? "border-red-500 focus-visible:ring-red-500/50" : ""
                  } ${isNameValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
                />
                {isNameValid && (
                  <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {nameError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Email</label>
                {isEmailValid && (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Válido
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setApiError("");
                  }}
                  onBlur={() => setEmailBlurred(true)}
                  required
                  disabled={loading}
                  className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10 ${
                    emailError ? "border-red-500 focus-visible:ring-red-500/50" : ""
                  } ${isEmailValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
                />
                {isEmailValid && (
                  <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {emailError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Palavra-passe</label>
                {isPasswordValid && (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Segura
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setApiError("");
                  }}
                  onBlur={() => setPasswordBlurred(true)}
                  required
                  disabled={loading}
                  className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10 ${
                    passwordError ? "border-red-500 focus-visible:ring-red-500/50" : ""
                  } ${isPasswordValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
                />
                {isPasswordValid && (
                  <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Password checklist */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1.5 mt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Requisitos de Segurança</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className={`text-xs flex items-center gap-1.5 transition-colors ${hasMinLength ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <span className="text-base shrink-0">{hasMinLength ? "✓" : "○"}</span>
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`text-xs flex items-center gap-1.5 transition-colors ${hasUppercase ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <span className="text-base shrink-0">{hasUppercase ? "✓" : "○"}</span>
                    <span>Pelo menos 1 maiúscula</span>
                  </div>
                  <div className={`text-xs flex items-center gap-1.5 transition-colors ${hasNumber ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <span className="text-base shrink-0">{hasNumber ? "✓" : "○"}</span>
                    <span>Pelo menos 1 número</span>
                  </div>
                  <div className={`text-xs flex items-center gap-1.5 transition-colors ${hasSpecial ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <span className="text-base shrink-0">{hasSpecial ? "✓" : "○"}</span>
                    <span>1 caractere especial</span>
                  </div>
                </div>
              </div>

              {passwordError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full text-white font-semibold rounded-xl h-10 transition-all ${
                isFormValid
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar conta...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Já tem conta?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                Fazer login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
