import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const { user, resendVerificationEmail } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerificationEmail(user.email || "");
      setResent(true);
      toast.success("Email de verificação reenviado!");
      setTimeout(() => setResent(false), 3000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl text-white">Verifique o Seu Email</CardTitle>
          <CardDescription className="text-slate-400">
            Enviámos um link de verificação para <strong>{user.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            Clique no link no email para verificar a sua conta. Se não recebeu o email, verifique
            a pasta de spam.
          </p>

          <Button
            onClick={handleResend}
            disabled={loading || resent}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A reenviar...
              </>
            ) : resent ? (
              "Email reenviado! Verifique a sua caixa de entrada"
            ) : (
              "Reenviar Email de Verificação"
            )}
          </Button>

          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Continuar para a Aplicação
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
