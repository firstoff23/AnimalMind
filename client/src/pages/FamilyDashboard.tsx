import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import FamilyInvite from "@/components/FamilyInvite";
import { trpc } from "@/lib/trpc";
import { PawPrint, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function FamilyDashboard({ params }: { params?: { code?: string } }) {
  const [, setLocation] = useLocation();
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState(params?.code ?? "");
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (params?.code) setJoinCode(params.code.toUpperCase());
  }, [params?.code]);

  const membersQuery = trpc.family.getMembers.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const familyId = membersQuery.data?.[0]?.familyId;

  const animalsQuery = trpc.family.getAnimals.useQuery(undefined, {
    enabled: isAuthenticated && !!familyId,
    retry: false,
  });
  const activityQuery = trpc.family.getActivity.useQuery(undefined, {
    enabled: isAuthenticated && !!familyId,
    retry: false,
  });

  const createFamilyMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      setFamilyName("");
      toast.success("Família criada.");
      utils.family.getMembers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const joinMutation = trpc.family.join.useMutation({
    onSuccess: () => {
      toast.success("Entraste na família.");
      utils.family.getMembers.invalidate();
      utils.family.getAnimals.invalidate();
      setLocation("/family");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
              <Users size={16} />
              Modo Família
            </p>
            <h1 className="mt-2 text-3xl font-bold">Gestão partilhada</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Grupos familiares, convites, animais partilhados e notificações de atividade.
            </p>
          </div>
          <Button onClick={() => setLocation("/dashboard")} variant="outline" className="border-slate-700">
            Voltar ao dashboard
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createFamilyMutation.mutate({ name: familyName });
            }}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-4"
          >
            <p className="text-sm font-semibold text-slate-100">Criar família</p>
            <div className="mt-3 flex gap-2">
              <input
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                placeholder="Ex: Família Inácio"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
              />
              <Button
                type="submit"
                disabled={createFamilyMutation.isPending || familyName.trim().length === 0}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Criar
              </Button>
            </div>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              joinMutation.mutate({ code: joinCode.toUpperCase() });
            }}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-4"
          >
            <p className="text-sm font-semibold text-slate-100">Juntar por convite</p>
            <div className="mt-3 flex gap-2">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase tracking-[0.2em] text-slate-100 outline-none focus:border-emerald-500"
              />
              <Button
                type="submit"
                disabled={joinMutation.isPending || joinCode.length !== 6}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Entrar
              </Button>
            </div>
          </form>
        </div>

        <FamilyInvite />

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
          <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Membros</h2>
            <div className="mt-3 space-y-2">
              {membersQuery.data?.length ? (
                membersQuery.data.map((member) => (
                  <div key={`${member.familyId}-${member.userId}`} className="flex items-center gap-3 rounded-lg bg-slate-950 p-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
                      {(member.name || member.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{member.name || "Membro"}</p>
                      <p className="truncate text-xs text-slate-500">{member.email || member.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Ainda não há família ativa.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Animais partilhados</h2>
            <div className="mt-3 space-y-2">
              {animalsQuery.data?.length ? (
                animalsQuery.data.map((animal) => (
                  <div key={`${animal.familyId}-${animal.id}`} className="rounded-lg bg-slate-950 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <PawPrint size={15} className="text-emerald-400" />
                      {animal.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{animal.species === "dog" ? "Cão" : "Gato"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sem animais partilhados na família.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Notificações</h2>
            <div className="mt-3 space-y-2">
              {activityQuery.data?.length ? (
                activityQuery.data.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-950 p-3">
                    <p className="text-sm text-slate-200">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString("pt-PT")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Sem atividade recente de outros membros.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
