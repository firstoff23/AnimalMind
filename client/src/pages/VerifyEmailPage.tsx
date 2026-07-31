import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { AuthInlineNote, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmailPage() {
  const { user, resendVerificationEmail } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [setLocation, user]);

  if (!user) return null;

  const handleResend = async () => {
    setLoading(true);
    setError("");
    try {
      await resendVerificationEmail(user.email || "");
      setResent(true);
      toast.success("Email de verificação reenviado.");
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenviar email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verifique o email"
      subtitle="Confirme a sua conta para concluir o acesso ao PeloNaRoupa."
      eyebrow="Confirmação de conta"
      compact
    >
      <div className="space-y-4">
        <AuthInlineNote
          icon={MailCheck}
          tone="success"
          title="Link de confirmação enviado"
          description={
            <>
              Enviámos um link para <strong>{user.email}</strong>. Abra o email
              e confirme a conta antes de iniciar sessão.
            </>
          }
        />

        {error && (
          <p className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium leading-relaxed text-destructive">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleResend}
          disabled={loading || resent}
          className="h-11 w-full rounded-2xl text-sm font-semibold"
        >
          {loading
            ? "A reenviar..."
            : resent
              ? "Email reenviado"
              : "Reenviar email de verificação"}
        </Button>

        <Button
          type="button"
          onClick={() => setLocation("/login")}
          variant="outline"
          className="h-11 w-full rounded-2xl border-border bg-secondary/40 text-sm font-semibold"
        >
          Ir para login
        </Button>
      </div>
    </AuthShell>
  );
}
