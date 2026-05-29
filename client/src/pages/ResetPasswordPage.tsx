import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { requireSupabase } from "@/contexts/AuthContext";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(true);

  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [confirmPasswordBlurred, setConfirmPasswordBlurred] = useState(false);
  const [shake, setShake] = useState(false);
  const [apiError, setApiError] = useState("");

  // Verify token from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      setValidToken(false);
    }
  }, []);

  // Real-time password requirement checklist
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const isConfirmPasswordValid = confirmPassword.length > 0 && password === confirmPassword;

  const isFormValid = isPasswordValid && isConfirmPasswordValid;

  const passwordError = passwordBlurred && !isPasswordValid
    ? "A palavra-passe não cumpre todos os requisitos de segurança obrigatórios. Escolha uma palavra-passe mais forte para proteger a sua conta."
    : "";

  const confirmPasswordError = confirmPasswordBlurred && !isConfirmPasswordValid
    ? (confirmPassword.length === 0
      ? "Confirmação da palavra-passe obrigatória. Introduza a palavra-passe novamente no campo para verificação."
      : "As palavras-passe introduzidas não coincidem. Digite exatamente a mesma palavra-passe nos dois campos.")
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
      const { error } = await requireSupabase().auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Palavra-passe alterada com sucesso!");
      setLocation("/login");
    } catch (error: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setApiError(
        error.message ||
        "Não foi possível alterar a sua palavra-passe. O link de recuperação poderá ter expirado ou ocorreu uma falha de comunicação com o servidor. Peça um novo link se necessário."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Link Inválido</CardTitle>
            <CardDescription className="text-slate-400">
              O link de recuperação expirou ou é inválido
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex gap-2 text-xs leading-relaxed mb-4 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}
            <Button
              onClick={() => setLocation("/forgot-password")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              Solicitar Novo Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md bg-slate-900 border-slate-800 transition-transform ${shake ? "animate-shake" : ""}`}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">Definir Nova Palavra-passe</CardTitle>
          <CardDescription className="text-slate-400">
            Introduza a sua nova palavra-passe
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
                <label className="text-sm font-medium text-slate-300">Nova Palavra-passe</label>
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Confirmar Palavra-passe</label>
                {isConfirmPasswordValid && (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Coincide
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setApiError("");
                  }}
                  onBlur={() => setConfirmPasswordBlurred(true)}
                  required
                  disabled={loading}
                  className={`bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10 ${
                    confirmPasswordError ? "border-red-500 focus-visible:ring-red-500/50" : ""
                  } ${isConfirmPasswordValid ? "border-emerald-500/50 focus-visible:ring-emerald-500/50" : ""}`}
                />
                {isConfirmPasswordValid && (
                  <Check className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {confirmPasswordError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed mt-1 flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{confirmPasswordError}</span>
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
                  A alterar...
                </>
              ) : (
                "Alterar Palavra-passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
