import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { requireSupabase, useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [emailBlurred, setEmailBlurred] = useState(false);
  const [shake, setShake] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  const emailError = emailBlurred && !isEmailValid
    ? "Este email não é válido. O formato do endereço de email está incorreto. Verifica se escreveste corretamente (ex: nome@exemplo.com)."
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    setApiError("");

    try {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Email de recuperação enviado! Verifique a sua caixa de entrada.");
    } catch (error: any) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setApiError(
        "Não foi possível enviar o email de recuperação. O endereço indicado poderá não estar associado a nenhuma conta ativa ou ocorreu um erro de ligação. Por favor, verifique se digitou o email corretamente e tente de novo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md bg-slate-900 border-slate-800 transition-transform ${shake ? "animate-shake" : ""}`}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">Recuperar Palavra-passe</CardTitle>
          <CardDescription className="text-slate-400">
            {sent
              ? "Email enviado com sucesso"
              : "Introduza o seu email para receber um link de recuperação"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex gap-2 text-xs leading-relaxed mb-4 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                disabled={loading || !isEmailValid}
                className={`w-full text-white font-semibold rounded-xl h-10 transition-all ${
                  isEmailValid
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-slate-300">
                Enviámos um link de recuperação para <strong>{email}</strong>. Verifique a sua
                caixa de entrada e spam.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Voltar ao Login
              </Button>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
