import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  FileAudio,
  FileText,
  HeartPulse,
  type LucideIcon,
  PawPrint,
  Save,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isVeterinaryRole } from "@/lib/roles";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "../../../shared/types";
import { STATE_LABELS } from "../../../shared/types";

type CaseStatus = "stable" | "monitor" | "requires_attention";

const caseStatusOptions: Array<{
  value: CaseStatus;
  label: string;
  description: string;
}> = [
  { value: "stable", label: "Estável", description: "Sem sinais prioritários" },
  {
    value: "monitor",
    label: "Monitorizar",
    description: "Requer acompanhamento",
  },
  {
    value: "requires_attention",
    label: "Requer atenção",
    description: "Prioridade clínica",
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem registo";
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
  if (status === "requires_attention")
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (status === "monitor")
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function alertClass(severity: string) {
  if (severity === "critical")
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (severity === "warning")
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-secondary/70 text-primary">
          <Icon size={15} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VetPetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const animalId = Number.parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const [periodDays, setPeriodDays] = useState(30);
  const [clinicalNote, setClinicalNote] = useState("");

  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery();
  const isVet = isVeterinaryRole(meQuery.data?.role);
  const validAnimalId = Number.isFinite(animalId) && animalId > 0;

  useEffect(() => {
    if (!validAnimalId) {
      setLocation("/vet");
    }
  }, [setLocation, validAnimalId]);

  useEffect(() => {
    if (!meQuery.isLoading && meQuery.data && !isVet) {
      toast.error(
        "Modo Veterinário disponível apenas para contas profissionais.",
      );
      setLocation("/dashboard");
    }
  }, [isVet, meQuery.data, meQuery.isLoading, setLocation]);

  const detailQuery = trpc.vet.getPetDetail.useQuery(
    { animalId, days: periodDays },
    { enabled: isVet && validAnimalId },
  );

  const addNoteMutation = trpc.vet.addNote.useMutation({
    onSuccess: async () => {
      toast.success("Nota clínica interna guardada.");
      setClinicalNote("");
      await utils.vet.getPetDetail.invalidate({ animalId, days: periodDays });
    },
    onError: (error) => toast.error(error.message),
  });

  const setCaseStatusMutation = trpc.vet.setCaseStatus.useMutation({
    onSuccess: async () => {
      toast.success("Estado do caso atualizado.");
      await Promise.all([
        utils.vet.getPetDetail.invalidate({ animalId, days: periodDays }),
        utils.vet.getDashboard.invalidate(),
        utils.vet.listSharedPets.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const trend = useMemo(
    () => detailQuery.data?.trend.slice(-7) ?? [],
    [detailQuery.data?.trend],
  );
  const latestTrendValue =
    trend.length > 0
      ? Math.max(...trend.map((item) => item.confidence), 0.01)
      : 1;
  const isLoading = meQuery.isLoading || (isVet && detailQuery.isLoading);

  if (isLoading) {
    return <AppShellSkeleton mode="content" variant="detail" />;
  }

  if (!isVet || !validAnimalId) {
    return null;
  }

  if (detailQuery.error) {
    return (
      <div className="page-enter mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 px-4 pb-24 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/vet")}
          className="w-fit gap-1.5 text-muted-foreground"
        >
          <ArrowLeft size={15} />
          Voltar
        </Button>
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5">
          <p className="text-sm font-semibold text-rose-100">
            Não foi possível abrir este caso.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-100/75">
            {detailQuery.error.message}
          </p>
          <Button
            onClick={() => detailQuery.refetch()}
            className="mt-4 h-9 rounded-xl text-xs"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;
  if (!detail) return null;

  const animal = detail.animal;

  return (
    <div className="page-enter mx-auto flex min-h-full w-full max-w-lg flex-col gap-5 px-4 pb-24 pt-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/90 p-5">
        <div className="absolute right-[-20px] top-[-20px] text-primary/5 pointer-events-none select-none rotate-12">
          <PawPrint size={140} />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-border bg-secondary">
            <PawPrint size={28} className="text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="truncate text-2xl font-bold text-foreground">
                {animal.name}
              </h1>
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] h-5 py-0 px-2">
                <Stethoscope size={10} className="mr-1 inline" />
                Caso clínico
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {speciesLabel(animal.species)} ·{" "}
              {animal.breed || "Raça indefinida"} · {animal.age ?? "?"} anos
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn("text-[10px]", statusClass(detail.caseStatus))}
              >
                {caseStatusOptions.find(
                  (item) => item.value === detail.caseStatus,
                )?.label ?? detail.caseStatus}
              </Badge>
              <Badge
                variant="outline"
                className="border-border bg-secondary/60 text-[10px] text-muted-foreground"
              >
                {detail.recentEvents.length} análises em {periodDays} dias
              </Badge>
            </div>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <UserRound size={14} className="text-primary" />
            Tutor responsável
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {detail.owner.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {detail.owner.email || "Email não disponível"}
          </p>
          {animal.ownerNote && (
            <p className="mt-3 border-l-2 border-primary/40 pl-3 text-[11px] leading-relaxed text-muted-foreground">
              {animal.ownerNote}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/85 p-4">
        <SectionHeader
          icon={HeartPulse}
          title="Estado clínico do caso"
          subtitle="Visível apenas no contexto profissional"
        />
        <div className="mt-4 grid gap-2">
          {caseStatusOptions.map((option) => {
            const active = detail.caseStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={setCaseStatusMutation.isPending}
                onClick={() =>
                  setCaseStatusMutation.mutate({
                    animalId,
                    status: option.value,
                  })
                }
                className={cn(
                  "rounded-2xl border p-3 text-left transition-colors active-scale tap-highlight-none",
                  active
                    ? statusClass(option.value)
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-0.5 text-[11px] opacity-75">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={AlertTriangle}
          title="Alertas clínicos"
          subtitle="Stress repetido, baixa confiança e tendências"
        />
        {detail.alerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-emerald-100">
                  Sem alertas ativos
                </p>
                <p className="text-[11px] text-emerald-100/70">
                  Não foram detetados sinais prioritários neste período.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {detail.alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-2xl border p-4",
                  alertClass(alert.severity),
                )}
              >
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-80">
                  {alert.description}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {formatDate(alert.detectedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card/85 p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader
            icon={Activity}
            title="Tendência recente"
            subtitle="Confiança por análise"
          />
          <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriodDays(days)}
                className={cn(
                  "h-7 rounded-lg px-2 text-[10px] font-semibold transition-colors",
                  periodDays === days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
        {trend.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
            Ainda não há dados suficientes para mostrar tendência.
          </p>
        ) : (
          <div className="mt-5 flex h-28 items-end gap-2">
            {trend.map((item, index) => {
              const height = Math.max(
                18,
                (item.confidence / latestTrendValue) * 100,
              );
              return (
                <div
                  key={`${item.date}-${index}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-20 w-full items-end rounded-xl bg-secondary/50 px-1">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-primary to-cyan-300"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {item.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={ClipboardList}
          title="Histórico recente"
          subtitle="Classificações e observações do tutor"
        />
        {detail.recentEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-xs text-muted-foreground">
            Sem classificações recentes neste período.
          </div>
        ) : (
          <div className="space-y-3">
            {detail.recentEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-border bg-card/85 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {event.emoji}{" "}
                      {event.stateLabel || stateLabel(event.state)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(event.createdAt)} ·{" "}
                      {formatConfidence(event.confidence)} ·{" "}
                      {event.modelUsed || "modelo"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border bg-secondary/60 text-[10px] text-muted-foreground"
                  >
                    {formatConfidence(event.confidence)}
                  </Badge>
                </div>
                {event.notes && (
                  <p className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    {event.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={FileAudio}
          title="Gravações e análises"
          subtitle="Áudio partilhado pelo tutor quando disponível"
        />
        {detail.recordings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-xs text-muted-foreground">
            Sem gravações com áudio disponível para este período.
          </div>
        ) : (
          <div className="space-y-3">
            {detail.recordings.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-border bg-card/85 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {event.stateLabel || stateLabel(event.state)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                  >
                    Áudio
                  </Badge>
                </div>
                <audio
                  controls
                  src={event.audioUrl ?? undefined}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={FileText}
          title="Relatórios partilhados"
          subtitle="Dossiês comportamentais disponíveis"
        />
        <div className="space-y-3">
          {detail.reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-border bg-card/85 p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {report.title}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {report.eventCount} análises · Gerado em{" "}
                {formatDate(report.generatedAt)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/85 p-4">
        <SectionHeader
          icon={Stethoscope}
          title="Observações do veterinário"
          subtitle="Notas internas não visíveis ao tutor"
        />
        {detail.clinicalNotes && (
          <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nota clínica consolidada
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              {detail.clinicalNotes}
            </p>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {detail.notes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
              Ainda não existem notas internas para este caso.
            </p>
          ) : (
            detail.notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-border bg-secondary/40 p-3"
              >
                <p className="text-xs leading-relaxed text-foreground">
                  {note.note}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {formatDate(note.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            addNoteMutation.mutate({ animalId, note: clinicalNote });
          }}
        >
          <textarea
            value={clinicalNote}
            onChange={(event) => setClinicalNote(event.target.value)}
            placeholder="Adicionar nota clínica interna, observações ou recomendações..."
            className="min-h-28 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          <Button
            type="submit"
            disabled={
              addNoteMutation.isPending || clinicalNote.trim().length < 2
            }
            className="h-10 w-full rounded-xl text-xs font-semibold"
          >
            <Save size={15} />
            {addNoteMutation.isPending
              ? "A guardar..."
              : "Guardar nota interna"}
          </Button>
        </form>
      </section>
    </div>
  );
}
