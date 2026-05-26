import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { requireSupabase } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Email de recuperação enviado! Verifique a sua caixa de entrada.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">Recuperar Palavra-passe</CardTitle>
          <CardDescription className="text-slate-400">
            {sent
              ? "Email enviado com sucesso"
              : "Introduza o seu email para receber um link de recuperação"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
