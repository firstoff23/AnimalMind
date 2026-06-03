import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import FamilyInvite from "@/components/FamilyInvite";
import { trpc } from "@/lib/trpc";
import { PawPrint, Users, AlertCircle, Crown, UserRound } from "lucide-react";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

// Maps raw role values from the DB to readable Portuguese labels
function getRoleLabel(role: string): { label: string; className: string } {
  switch (role) {
    case "admin":
      return { label: "Proprietário", className: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
    case "member":
      return { label: "Membro", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    default:
      return { label: "Convidado", className: "text-slate-400 bg-slate-400/10 border-slate-400/20" };
  }
}

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

  const isLoading = membersQuery.isLoading || (!!familyId && (animalsQuery.isLoading || activityQuery.isLoading));
  const isError = membersQuery.isError || (!!familyId && (animalsQuery.isError || activityQuery.isError));

  if (isLoading) {
    return <AppShellSkeleton mode="content" variant="family" />;
  }

  if (isError) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 flex items-center justify-center pt-16">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 animate-shake max-w-md w-full">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-sm font-semibold text-foreground">
            Erro ao carregar dashboard de família.
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Falha ao comunicar com o servidor. Verifique a sua ligação e tente novamente.
          </p>
          <Button
            size="sm"
            onClick={() => {
              membersQuery.refetch();
              if (familyId) {
                animalsQuery.refetch();
                activityQuery.refetch();
              }
            }}
            className="bg-primary text-primary-foreground rounded-xl"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="page-enter max-w-lg mx-auto space-y-5 px-4 pt-6 pb-4 min-h-full text-slate-100">
      {/* Intro info card (instead of duplicate header) */}
      <div className="p-4 rounded-2xl bg-secondary/10 border border-border/60">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          <Users size={14} />
          Modo Família
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          Partilhe e faça a co-tutoria dos seus animais de estimação em tempo real com o seu grupo familiar doméstico.
        </p>
      </div>

      {/* Creation and Joining Action Forms */}
      <div className="space-y-4">
        {/* Create Family Form */}
        <SpotlightCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Criar família
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createFamilyMutation.mutate({ name: familyName });
            }}
            className="flex gap-2"
          >
            <input
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              placeholder="Ex: Família Inácio"
              className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <Button
              type="submit"
              disabled={createFamilyMutation.isPending || familyName.trim().length === 0}
              className="bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              Criar
            </Button>
          </form>
        </SpotlightCard>

        {/* Join Family Form */}
        <SpotlightCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Juntar por convite
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              joinMutation.mutate({ code: joinCode.toUpperCase() });
            }}
            className="flex gap-2"
          >
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <Button
              type="submit"
              disabled={joinMutation.isPending || joinCode.length !== 6}
              className="bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 active-scale tap-highlight-none"
            >
              Entrar
            </Button>
          </form>
        </SpotlightCard>
      </div>

      <FamilyInvite />

      {/* Lists Section (Members, Shared Animals, Notifications) */}
      <div className="space-y-4">
        {/* Members list */}
        <SpotlightCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Membros da Família
          </h3>
          <div className="space-y-2">
            {membersQuery.data?.length ? (
              membersQuery.data.map((member) => {
                const roleInfo = getRoleLabel(member.role);
                const displayName =
                  (member.name && member.name.trim().length > 0 ? member.name.trim() : null) ??
                  (member.email ? member.email.split("@")[0] : null) ??
                  "Utilizador";
                const avatarChar = displayName.slice(0, 1).toUpperCase();
                const isOwner = member.role === "admin";
                return (
                  <div
                    key={`${member.familyId}-${member.userId}`}
                    className="flex items-center gap-3 rounded-xl bg-secondary/10 border border-border/40 p-3"
                  >
                    {/* Avatar */}
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                        isOwner
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {avatarChar}
                    </div>

                    {/* Name + email */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                      {member.email && (
                        <p className="truncate text-[10px] text-muted-foreground mt-0.5">{member.email}</p>
                      )}
                    </div>

                    {/* Role badge */}
                    <span
                      className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleInfo.className}`}
                    >
                      {isOwner ? <Crown size={9} /> : <UserRound size={9} />}
                      {roleInfo.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-2 text-center bg-secondary/10 border border-border/30 rounded-xl">
                Ainda não tem nenhuma família ativa.
              </p>
            )}
          </div>
        </SpotlightCard>

        {/* Shared Animals list */}
        <SpotlightCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Animais partilhados
          </h3>
          <div className="space-y-2">
            {animalsQuery.data?.length ? (
              animalsQuery.data.map((animal) => (
                <div key={`${animal.familyId}-${animal.id}`} className="rounded-xl bg-secondary/10 border border-border/40 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PawPrint size={15} className="text-emerald-400 shrink-0" />
                    <p className="text-xs font-semibold text-foreground">{animal.name}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {animal.species === "dog" ? "Cão" : "Gato"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2 text-center bg-secondary/10 border border-border/30 rounded-xl">
                Sem animais partilhados na família.
              </p>
            )}
          </div>
        </SpotlightCard>

        {/* Notifications/Recent Activity list */}
        <SpotlightCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notificações recentes
          </h3>
          <div className="space-y-2">
            {activityQuery.data?.length ? (
              activityQuery.data.map((item) => (
                <div key={item.id} className="rounded-xl bg-secondary/10 border border-border/40 p-3 space-y-1">
                  <p className="text-xs text-foreground leading-relaxed">{item.message}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("pt-PT")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2 text-center bg-secondary/10 border border-border/30 rounded-xl">
                Sem atividade recente de outros membros.
              </p>
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
