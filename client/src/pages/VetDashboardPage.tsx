import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  HeartPulse,
  Inbox,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getVeterinaryRoleLabel, isVeterinaryRole } from "@/lib/roles";
import { STATE_LABELS } from "../../../shared/types";
import type { EmotionalState } from "../../../shared/types";

type VetTab = "overview" | "animals" | "alerts";
type SpeciesFilter = "all" | "dog" | "cat";
type CaseFilter = "all" | "stable" | "monitor" | "attention";

const tabs: Array<{ id: VetTab; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Resumo", icon: Activity },
  { id: "animals", label: "Animais", icon: PawPrint },
  { id: "alerts", label: "Alertas", icon: Bell },
];

const statusCopy = {
  stable: "estável",
  monitor: "monitorizar",
  requires_attention: "requer atenção",
} as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem análises";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "sem confiança";
  return `${Math.round(value * 100)}%`;
}

function speciesLabel(species: string) {
  if (species === "dog") return "Cão";
  if (species === "cat") return "Gato";
  return species || "Animal";
}

function stateLabel(state: string | null | undefined) {
  if (!state) return "Sem registos";
  return STATE_LABELS[state as EmotionalState] ?? state;
}

function statusClass(status: string) {
  if (status === "requer atenção") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "monitorizar") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function alertClass(severity: string) {
  if (severity === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (severity === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
        </div>
        <span className={cn("rounded-xl border p-2", toneClass)}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{helper}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-secondary/60 text-primary">
        <Icon size={19} />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export default function VetDashboardPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<VetTab>("overview");
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>("all");
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("all");

  const meQuery = trpc.auth.me.useQuery();
  const isVet = isVeterinaryRole(meQuery.data?.role);

  useEffect(() => {
    if (!meQuery.isLoading && meQuery.data && !isVet) {
      toast.error("Modo Veterinário disponível apenas para contas profissionais.");
      setLocation("/dashboard");
    }
  }, [isVet, meQuery.data, meQuery.isLoading, setLocation]);

  const dashboardQuery = trpc.vet.getDashboard.useQuery(undefined, {
    enabled: isVet,
  });
  const petsQuery = trpc.vet.listSharedPets.useQuery(
    { species: speciesFilter },
    { enabled: isVet }
  );

  const summary = dashboardQuery.data?.summary ?? {
    animalsFollowed: 0,
    reportsReceived: 0,
    recentAlerts: 0,
    casesRequiringAttention: 0,
  };

  const animals = petsQuery.data ?? dashboardQuery.data?.animals ?? [];
  const filteredAnimals = useMemo(() => {
    return animals.filter((animal) => {
      if (caseFilter === "stable") return animal.caseStatus === "stable";
      if (caseFilter === "monitor") return animal.caseStatus === "monitor";
      if (caseFilter === "attention") return animal.caseStatus === "requires_attention" || animal.overallStatus === "requer atenção";
      return true;
    });
  }, [animals, caseFilter]);

  const priorityAlerts = dashboardQuery.data?.priorityAlerts ?? [];
  const recentActivity = dashboardQuery.data?.recentActivity ?? [];
  const roleLabel = getVeterinaryRoleLabel(meQuery.data?.role);
  const isLoading = meQuery.isLoading || (isVet && (dashboardQuery.isLoading || petsQuery.isLoading));
  const error = dashboardQuery.error || petsQuery.error;

  if (isLoading) {
    return <AppShellSkeleton mode="content" variant="vet" />;
  }

  if (!isVet) {
    return null;
  }

  return (
    <div className="page-enter mx-auto flex min-h-full w-full max-w-lg flex-col gap-5 px-4 pb-24 pt-6">
      <header className="space-y-4">
        <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/12 via-card to-cyan-500/8 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <HeartPulse size={21} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Clínica comportamental AnimalMind</p>
                <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-[9px] py-0 px-2 h-4 uppercase font-bold tracking-wider">
                  {roleLabel}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Casos partilhados por tutores, sinais recentes e notas internas num único fluxo.
              </p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
          <p className="text-sm font-semibold text-rose-200">Não foi possível carregar o modo veterinário.</p>
          <p className="mt-1 text-xs text-rose-100/75">{error.message}</p>
          <Button
            onClick={() => {
              dashboardQuery.refetch();
              petsQuery.refetch();
            }}
            className="mt-3 h-9 rounded-xl text-xs"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <KpiCard
          title="Animais acompanhados"
          value={summary.animalsFollowed}
          helper="Casos ativos partilhados consigo"
          icon={PawPrint}
          tone="emerald"
        />
        <KpiCard
          title="Relatórios recebidos"
          value={summary.reportsReceived}
          helper="Análises recentes nos últimos 30 dias"
          icon={ClipboardList}
          tone="cyan"
        />
        <KpiCard
          title="Alertas recentes"
          value={summary.recentAlerts}
          helper="Sinais clínicos calculados"
          icon={Bell}
          tone="amber"
        />
        <KpiCard
          title="Casos com atenção"
          value={summary.casesRequiringAttention}
          helper="Prioridade clínica elevada"
          icon={AlertTriangle}
          tone="rose"
        />
      </section>

      <nav className="grid grid-cols-3 rounded-2xl border border-border bg-secondary/50 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors active-scale tap-highlight-none",
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Animais e clientes recentes</h2>
                <p className="text-[11px] text-muted-foreground">Últimos casos partilhados por tutores</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("animals")}
                className="h-8 px-2 text-xs text-primary"
              >
                Ver todos
              </Button>
            </div>
            {animals.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Sem animais partilhados"
                description="Quando um tutor partilhar um animal consigo, o caso aparece aqui com histórico e relatórios."
              />
            ) : (
              <div className="space-y-3">
                {animals.slice(0, 4).map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => setLocation(`/vet/animal/${animal.id}`)}
                    className="w-full rounded-2xl border border-border bg-card/85 p-4 text-left transition-colors hover:border-primary/40 active-scale tap-highlight-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <PawPrint size={16} className="text-muted-foreground flex-shrink-0" />
                          <p className="truncate text-sm font-bold text-foreground">{animal.name}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {speciesLabel(animal.species)} · {animal.breed || "Raça indefinida"} · Tutor: {animal.ownerName}
                        </p>
                      </div>
                      <ChevronRight size={17} className="mt-1 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusClass(animal.overallStatus))}>
                        {animal.overallStatus}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {stateLabel(animal.lastState)} · {formatConfidence(animal.lastConfidence)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Atividade recente</h2>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Sem atividade recente"
                description="As novas análises aparecem aqui assim que os tutores gravarem sons."
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card/85 p-4">
                <div className="space-y-4">
                  {recentActivity.map((item) => (
                    <div key={`${item.animalId}-${item.createdAt}`} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.animalName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {stateLabel(item.state)} · {formatConfidence(item.confidence)} · Tutor: {item.ownerName}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Alertas prioritários</h2>
            {priorityAlerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-emerald-300" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">Sem alertas prioritários</p>
                    <p className="text-[11px] text-emerald-100/70">Os casos ativos estão estáveis ou apenas em monitorização ligeira.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn("rounded-2xl border p-4", alertClass(alert.severity))}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="mt-1 text-xs leading-relaxed opacity-80">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "animals" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card/85 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter size={14} />
              Filtros
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-[11px] font-medium text-muted-foreground">
                Espécie
                <select
                  value={speciesFilter}
                  onChange={(event) => setSpeciesFilter(event.target.value as SpeciesFilter)}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Todas</option>
                  <option value="dog">Cães</option>
                  <option value="cat">Gatos</option>
                </select>
              </label>
              <label className="space-y-1.5 text-[11px] font-medium text-muted-foreground">
                Estado
                <select
                  value={caseFilter}
                  onChange={(event) => setCaseFilter(event.target.value as CaseFilter)}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Todos</option>
                  <option value="stable">Estável</option>
                  <option value="monitor">Monitorizar</option>
                  <option value="attention">Requer atenção</option>
                </select>
              </label>
            </div>
          </section>

          {filteredAnimals.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nenhum caso encontrado"
              description="Ajuste os filtros ou aguarde por novas partilhas de tutores."
            />
          ) : (
            <div className="space-y-3">
              {filteredAnimals.map((animal) => (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => setLocation(`/vet/animal/${animal.id}`)}
                  className="w-full rounded-2xl border border-border bg-card/85 p-4 text-left transition-colors hover:border-primary/40 active-scale tap-highlight-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                        <PawPrint size={22} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{animal.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {speciesLabel(animal.species)} · {animal.breed || "Raça indefinida"} · {animal.age ?? "?"} anos
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <UserRound size={12} />
                          Tutor: {animal.ownerName}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={17} className="mt-1 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl border border-border bg-secondary/50 p-2">
                      <p className="text-muted-foreground">Última análise</p>
                      <p className="mt-0.5 truncate font-semibold text-foreground">{formatDate(animal.lastEventAt)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-2">
                      <p className="text-muted-foreground">Estado geral</p>
                      <p className="mt-0.5 truncate font-semibold text-foreground">{animal.overallStatus}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", statusClass(animal.overallStatus))}>
                      {animal.overallStatus}
                    </Badge>
                    <Badge variant="outline" className="border-border bg-secondary/60 text-[10px] text-muted-foreground">
                      {statusCopy[animal.caseStatus] ?? animal.caseStatus}
                    </Badge>
                    {animal.alertCount > 0 && (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                        {animal.alertCount} alerta{animal.alertCount === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-3">
          {priorityAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nenhum alerta prioritário"
              description="O sistema continua a monitorizar stress repetido, baixa confiança, tendências negativas e ausência de análises."
            />
          ) : (
            priorityAlerts.map((alert) => {
              const animal = animals.find((item) => item.id === alert.animalId);
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => setLocation(`/vet/animal/${alert.animalId}`)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-transform active-scale tap-highlight-none",
                    alertClass(alert.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <ChevronRight size={16} className="shrink-0 opacity-70" />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed opacity-80">{alert.description}</p>
                      <p className="mt-2 text-[11px] font-semibold opacity-90">
                        {animal?.name ?? `Animal #${alert.animalId}`} · {formatDate(alert.detectedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
