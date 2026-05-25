import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Copy, Link2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function FamilyInvite() {
  const [inviteUrl, setInviteUrl] = useState("");
  const createInviteMutation = trpc.family.createInvite.useMutation({
    onSuccess: (invite) => {
      setInviteUrl(invite.inviteUrl);
      toast.success("Convite criado por 7 dias.");
    },
    onError: (error) => toast.error(error.message),
  });

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado.");
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Convite familiar</p>
          <p className="text-xs text-slate-400">Gera um código único de 6 caracteres válido por 7 dias.</p>
        </div>
        <Button
          onClick={() => createInviteMutation.mutate({})}
          disabled={createInviteMutation.isPending}
          className="bg-emerald-500 text-white hover:bg-emerald-600"
        >
          <Plus size={15} />
          Gerar
        </Button>
      </div>

      {inviteUrl && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
          <Link2 size={15} className="text-emerald-400" />
          <input
            readOnly
            value={inviteUrl}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none"
          />
          <Button onClick={copyInvite} size="sm" variant="outline" className="border-slate-700">
            <Copy size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
