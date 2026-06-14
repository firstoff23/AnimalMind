import { Copy, Link2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { trpc } from "@/lib/trpc";

export default function FamilyInvite() {
  const [inviteUrl, setInviteUrl] = useState("");
  const createInviteMutation = trpc.family.createInvite.useMutation({
    onSuccess: (invite) => {
      setInviteUrl(invite.inviteUrl);
      toast.success("Convite criado! Válido por 7 dias.");
    },
    onError: (error) => toast.error(error.message),
  });

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente o link acima.");
    }
  };

  return (
    <SpotlightCard className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            Convite familiar
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Gera um link e código único válido por 7 dias.
          </p>
        </div>
        <Button
          onClick={() => createInviteMutation.mutate({})}
          disabled={createInviteMutation.isPending}
          aria-label="Gerar novo link de convite familiar"
          className="shrink-0 bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 active-scale tap-highlight-none"
        >
          <Plus size={14} className="mr-1 shrink-0" aria-hidden="true" />
          {createInviteMutation.isPending ? "A gerar…" : "Gerar"}
        </Button>
      </div>

      {inviteUrl && (
        <div
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary/15 p-2 animate-fade-in"
          aria-live="polite"
          aria-label="Link de convite gerado"
        >
          <Link2
            size={14}
            className="text-emerald-400 shrink-0 ml-1"
            aria-hidden="true"
          />
          <input
            readOnly
            value={inviteUrl}
            aria-label="Link de convite"
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none select-all focus-visible:ring-0"
          />
          <Button
            onClick={copyInvite}
            size="sm"
            variant="outline"
            aria-label="Copiar link de convite"
            className="shrink-0 border-border active-scale tap-highlight-none rounded-lg h-8 px-2.5 focus-visible:ring-1 focus-visible:ring-primary/40"
          >
            <Copy size={13} aria-hidden="true" />
          </Button>
        </div>
      )}
    </SpotlightCard>
  );
}
