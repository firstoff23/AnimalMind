import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import FamilyInvite from "@/components/FamilyInvite";
import { trpc } from "@/lib/trpc";
import {
  PawPrint,
  Users,
  AlertCircle,
  Crown,
  UserRound,
  LogOut,
  ChevronDown,
  ChevronUp,
  Plus,
  Link,
} from "lucide-react";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

// Maps raw role values from the DB to readable Portuguese labels
function getRoleLabel(role: string): { label: string; className: string } {
  switch (role) {
    case "admin":
      return {
        label: "Proprietário",
        className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
      };
    case "member":
      return {
        label: "Membro",
        className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      };
    default:
      return {
        label: "Convidado",
        className: "text-slate-400 bg-slate-400/10 border-slate-400/20",
      };
  }
}

// Confirmation modal for leave action
function LeaveConfirmModal({
  open,
  onConfirm,
  onCancel,
  isPending,
  isOwner,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  isOwner: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-family-title"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-border rounded-2xl p-5 space-y-4 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/15">
            <LogOut size={18} className="text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h2 id="leave-family-title" className="text-sm font-bold text-foreground">
              {isOwner ? "Apagar família?" : "Sair da família?"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {isOwner
                ? "Como único membro e proprietário, esta família será apagada permanentemente."
                : "Irás perder o acesso aos animais e atividade partilhada desta família."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-xl text-xs border border-border/40 hover:bg-secondary/20"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl text-xs bg-red-500/80 hover:bg-red-500 text-white border-0 active-scale tap-highlight-none"
          >
            {isPending ? "A sair…" : isOwner ? "Apagar família" : "Sair da família"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyDashboard({
  params,
}: {
  params?: { code?: string };
}) {
  const [, setLocation] = useLocation();
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState(params?.code ?? "");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const utils = trpc.useUtils();
  const { isAuthenticated, user } = useAuth();
  // Identify current user's membership by email (user.id is Supabase UUID, member.userId is DB integer)
  const currentUserEmail = user?.email ?? null;

  useEffect(() => {
    if (params?.code) {
      setJoinCode(params.code.toUpperCase());
      setShowJoinForm(true);
    }
  }, [params?.code]);

  const membersQuery = trpc.family.getMembers.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const familyId = membersQuery.data?.[0]?.familyId;
  const hasFamilyData = !!familyId;

  const currentUserMember = membersQuery.data?.find(
    (m) => m.email && currentUserEmail && m.email.toLowerCase() === currentUserEmail.toLowerCase()
  );
  const currentUserIsOwner = currentUserMember?.role === "admin";

  const animalsQuery = trpc.family.getAnimals.useQuery(undefined, {
    enabled: isAuthenticated && hasFamilyData,
    retry: false,
  });
  const activityQuery = trpc.family.getActivity.useQuery(undefined, {
    enabled: isAuthenticated && hasFamilyData,
    retry: false,
  });

  const createFamilyMutation = trpc.family.create.useMutation({
    onSuccess: () => {
      setFamilyName("");
      toast.success("Família criada com sucesso!");
      utils.family.getMembers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const joinMutation = trpc.family.join.useMutation({
    onSuccess: () => {
      toast.success("Entraste na família!");
      utils.family.getMembers.invalidate();
      utils.family.getAnimals.invalidate();
      setLocation("/family");
    },
    onError: (error) => toast.error(error.message),
  });

  const leaveMutation = trpc.family.leave.useMutation({
    onSuccess: () => {
      toast.success("Saíste da família.");
      setLeaveModalOpen(false);
      utils.family.getMembers.invalidate();
      utils.family.getAnimals.invalidate();
      utils.family.getActivity.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
      setLeaveModalOpen(false);
    },
  });

  const isLoading =
    membersQuery.isLoading ||
    (hasFamilyData && (animalsQuery.isLoading || activityQuery.isLoading));
  const isError =
    membersQuery.isError ||
    (hasFamilyData && (animalsQuery.isError || activityQuery.isError));

  if (isLoading) {
    return <AppShellSkeleton mode="content" variant="family" />;
  }

  if (isError) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 flex items-center justify-center pt-16">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-3 max-w-md w-full">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Erro ao carregar o Modo Família
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Falha ao comunicar com o servidor. Verifique a sua ligação e tente
            novamente.
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
    <>
      <LeaveConfirmModal
        open={leaveModalOpen}
        onConfirm={() => {
          if (familyId) leaveMutation.mutate({ familyId });
        }}
        onCancel={() => setLeaveModalOpen(false)}
        isPending={leaveMutation.isPending}
        isOwner={currentUserIsOwner ?? false}
      />

      <div className="page-enter max-w-lg mx-auto space-y-4 px-4 pt-5 pb-6 min-h-full text-slate-100">
        {/* Header banner */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15">
            <Users size={16} className="text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Modo Família
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {hasFamilyData
                ? "Gere os membros, animais partilhados e atividade do seu grupo."
                : "Crie ou junte-se a uma família para partilhar a co-tutoria dos seus animais."}
            </p>
          </div>
        </div>

        {/* ── NO FAMILY YET: show create + join forms ── */}
        {!hasFamilyData && (
          <div className="space-y-3">
            {/* Create Family */}
            <SpotlightCard className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-emerald-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Criar nova família
                </h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createFamilyMutation.mutate({ name: familyName });
                }}
                className="flex gap-2"
              >
                <label htmlFor="family-name-input" className="sr-only">
                  Nome da família
                </label>
                <input
                  id="family-name-input"
                  name="familyName"
                  autoComplete="off"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ex: Família Inácio…"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                />
                <Button
                  type="submit"
                  disabled={
                    createFamilyMutation.isPending ||
                    familyName.trim().length === 0
                  }
                  className="bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 active-scale tap-highlight-none"
                >
                  {createFamilyMutation.isPending ? "A criar…" : "Criar"}
                </Button>
              </form>
            </SpotlightCard>

            {/* Join Family — collapsible */}
            <SpotlightCard className="p-4 space-y-0">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground py-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded"
                onClick={() => setShowJoinForm((v) => !v)}
                aria-expanded={showJoinForm}
              >
                <span className="flex items-center gap-2">
                  <Link size={14} aria-hidden="true" />
                  Juntar por convite
                </span>
                {showJoinForm ? (
                  <ChevronUp size={14} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} aria-hidden="true" />
                )}
              </button>

              {showJoinForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    joinMutation.mutate({ code: joinCode.toUpperCase() });
                  }}
                  className="flex gap-2 mt-3"
                >
                  <label htmlFor="join-code-input" className="sr-only">
                    Código de convite (6 caracteres)
                  </label>
                  <input
                    id="join-code-input"
                    name="joinCode"
                    autoComplete="off"
                    spellCheck={false}
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    placeholder="ABC123"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-foreground outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  />
                  <Button
                    type="submit"
                    disabled={
                      joinMutation.isPending || joinCode.length !== 6
                    }
                    className="bg-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold px-4 active-scale tap-highlight-none"
                  >
                    {joinMutation.isPending ? "A entrar…" : "Entrar"}
                  </Button>
                </form>
              )}
            </SpotlightCard>
          </div>
        )}

        {/* ── HAS FAMILY: show invite + management panels ── */}
        {hasFamilyData && (
          <>
            <FamilyInvite />

            {/* Members */}
            <SpotlightCard className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Membros da Família
              </h3>
              <div className="space-y-2" aria-live="polite">
                {membersQuery.data?.length ? (
                  membersQuery.data.map((member) => {
                    const roleInfo = getRoleLabel(member.role);
                    const displayName =
                      (member.name && member.name.trim().length > 0
                        ? member.name.trim()
                        : null) ??
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
                          aria-hidden="true"
                        >
                          {avatarChar}
                        </div>

                        {/* Name + email */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {displayName}
                          </p>
                          {member.email && (
                            <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                              {member.email}
                            </p>
                          )}
                        </div>

                        {/* Role badge */}
                        <span
                          className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleInfo.className}`}
                        >
                          {isOwner ? (
                            <Crown size={9} aria-hidden="true" />
                          ) : (
                            <UserRound size={9} aria-hidden="true" />
                          )}
                          {roleInfo.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center bg-secondary/10 border border-border/30 rounded-xl">
                    Sem membros encontrados.
                  </p>
                )}
              </div>
            </SpotlightCard>

            {/* Shared Animals */}
            <SpotlightCard className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Animais partilhados
              </h3>
              <div className="space-y-2">
                {animalsQuery.data?.length ? (
                  animalsQuery.data.map((animal) => (
                    <div
                      key={`${animal.familyId}-${animal.id}`}
                      className="rounded-xl bg-secondary/10 border border-border/40 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PawPrint
                          size={15}
                          className="text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold text-foreground truncate">
                          {animal.name}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 ml-2">
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

            {/* Activity */}
            <SpotlightCard className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Atividade recente
              </h3>
              <div className="space-y-2" aria-live="polite">
                {activityQuery.data?.length ? (
                  activityQuery.data.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-secondary/10 border border-border/40 p-3 space-y-1"
                    >
                      <p className="text-xs text-foreground leading-relaxed">
                        {item.message}
                      </p>
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

            {/* Leave Family */}
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold py-3 transition-colors active-scale tap-highlight-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              >
                <LogOut size={14} aria-hidden="true" />
                {currentUserIsOwner && (membersQuery.data?.length ?? 0) <= 1
                  ? "Apagar família"
                  : "Sair da família"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
