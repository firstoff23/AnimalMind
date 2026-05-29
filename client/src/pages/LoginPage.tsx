import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailBlurred, setEmailBlurred] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [shake, setShake] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length > 0;
  const isFormValid = isEmailValid && isPasswordValid;

  const emailError = emailBlurred && !isEmailValid
    ? "Este email não é válido. O formato do endereço de email está incorreto. Verifica se escreveste corretamente (ex: nome@exemplo.com)."
    : "";

  const passwordError = passwordBlurred && !isPasswordValid
    ? "A palavra-passe está vazia. É necessário introduzir a palavra-passe para autenticar a sua identidade. Escreva a sua palavra-passe no campo abaixo."
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
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
      setLocation("/");
    } catch (error: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setApiError(
        "Não foi possível iniciar a sessão. As credenciais introduzidas não coincidem com os nossos registos. Por favor, verifique se escreveu o email e a palavra-passe corretamente e tente de novo."
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
            Faça login na sua conta
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
                  autoComplete="username"
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
                    <Check className="w-3.5 h-3.5" /> Preenchida
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
                  autoComplete="current-password"
                />
                {isPasswordValid && (
                  <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
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
                  A fazer login...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-400 text-center">
              Não tem conta?{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                Criar conta
              </button>
            </p>
            <p className="text-sm text-slate-400 text-center">
              <button
                onClick={() => setLocation("/forgot-password")}
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                Esqueceu a palavra-passe?
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
