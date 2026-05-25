import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Clock, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

interface FamilyShareTabProps {
  animalId: number;
}

export default function FamilyShareTab({ animalId }: FamilyShareTabProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();

  // Query shares list
  const { data: shares = [], isLoading } = trpc.animals.listShares.useQuery({ animalId });
  const { data: familyMembers = [] } = trpc.family.getMembers.useQuery();

  // Mutation to invite co-tutor
  const inviteMutation = trpc.animals.inviteShare.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      setEmail("");
      utils.animals.listShares.invalidate({ animalId });
    },
    onError: (err) => {
      toast.error(`Erro ao convidar: ${err.message}`);
    },
  });

  // Mutation to revoke access
  const revokeMutation = trpc.animals.removeShare.useMutation({
    onSuccess: () => {
      toast.success("Partilha revogada com sucesso.");
      utils.animals.listShares.invalidate({ animalId });
    },
    onError: (err) => {
      toast.error(`Erro ao revogar: ${err.message}`);
    },
  });

  const shareWithFamilyMutation = trpc.family.shareAnimal.useMutation({
    onSuccess: () => {
      toast.success("Animal adicionado à família.");
      utils.family.getAnimals.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar à família: ${err.message}`);
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    inviteMutation.mutate({
      animalId,
      email: email.trim(),
      permission,
    });
  };

  const handleRevoke = (shareId: number) => {
    if (confirm("Tens a certeza que desejas revogar a partilha com este tutor?")) {
      revokeMutation.mutate({ shareId, animalId });
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Home size={18} className="text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Família</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Partilhe este animal com todos os membros da sua família ativa.
        </p>
        {familyMembers.length > 0 ? (
          <Button
            onClick={() => shareWithFamilyMutation.mutate({ animalId })}
            disabled={shareWithFamilyMutation.isPending}
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs"
          >
            {shareWithFamilyMutation.isPending ? "A adicionar..." : "Adicionar à família"}
          </Button>
        ) : (
          <Button
            onClick={() => setLocation("/family")}
            variant="outline"
            className="w-full border-border text-xs rounded-xl"
          >
            Criar ou juntar família
          </Button>
        )}
      </div>

      {/* Invite form */}
      <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <UserPlus size={18} className="text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Convidar Co-tutor</h3>
        </div>
        <form onSubmit={handleInviteSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Email do Co-tutor
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: familiar@email.com"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Permissão
              </label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "read" | "write")}
                className="w-full bg-background text-xs border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="read">Apenas Leitura (Estatísticas e Histórico)</option>
                <option value="write">Leitura e Escrita (Gravar e Baseline)</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={inviteMutation.isPending}
              className="h-9 shrink-0 bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 mt-4"
            >
              {inviteMutation.isPending ? "A enviar..." : "Convidar"}
            </Button>
          </div>
        </form>
      </div>

      {/* Shares List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users size={16} />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Tutores Associados</h3>
        </div>

        {isLoading ? (
          <div className="text-xs text-muted-foreground text-center py-4">A carregar partilhas...</div>
        ) : shares.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
            Ainda não partilhaste este perfil com nenhum tutor doméstico.
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{share.sharedWithEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {share.status === "accepted" ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Aceite
                      </span>
                    ) : share.status === "rejected" ? (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle size={10} /> Recusado
                      </span>
                    ) : (
                      <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                        <Clock size={10} /> Pendente
                      </span>
                    )}

                    <span className="text-[10px] text-muted-foreground">•</span>

                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/80 uppercase font-semibold text-muted-foreground">
                      {share.permission === "write" ? "Leitura & Escrita" : "Apenas Leitura"}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(share.id)}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  title="Revogar partilha"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
