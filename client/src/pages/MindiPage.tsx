import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { STATE_LABELS, type EmotionalState } from "../../../shared/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_REPLIES = [
  "O meu animal não come",
  "Sinais de stress",
  "Dicas de alimentação",
  "Quando ir ao veterinário",
];

const createMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2" aria-label="Mindi está a responder">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </div>
  );
}

function MindiAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-sm font-black text-primary shadow-[0_0_24px_rgba(16,185,129,0.16)]">
      M
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <MindiAvatar />}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card/95 text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <div className="prose prose-invert max-w-none text-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
            <Streamdown>{message.content}</Streamdown>
          </div>
        ) : (
          <TypingIndicator />
        )}
      </div>
    </div>
  );
}

function getContextSummary(
  animal: { name?: string; species?: string; breed?: string | null; age?: number | null } | null | undefined,
  latestState?: string
) {
  if (!animal) {
    return "Escolhe um animal no Perfil para a Mindi usar contexto automático.";
  }

  const species = animal.species === "dog" ? "Cão" : animal.species === "cat" ? "Gato" : "Animal";
  const breed = animal.breed || "raça indefinida";
  const age = typeof animal.age === "number" ? `${animal.age} anos` : "idade desconhecida";
  const recent = latestState ? `Último estado: ${latestState}.` : "Sem histórico recente.";
  return `${animal.name} · ${species} · ${breed} · ${age}. ${recent}`;
}

function buildClientFallbackResponse(message: string, animalName?: string): string {
  const name = animalName || "o teu animal";
  const normalized = message.toLocaleLowerCase("pt-PT");

  if (normalized.includes("não come") || normalized.includes("nao come") || normalized.includes("comer")) {
    return `${name} pode estar a recusar comida por stress, alteração de rotina, desconforto oral, náusea ou dor. Observa também água, energia, vómitos, diarreia e sinais de dor. Se não comer durante 24 horas, contacta um médico veterinário.`;
  }
  if (normalized.includes("stress") || normalized.includes("ansiedade")) {
    return `Para sinais de stress em ${name}, procura vocalizações fora do habitual, respiração rápida, esconder-se, lamber-se em excesso, postura tensa. Reduz estímulos e mantém uma rotina previsível. Se os sinais forem intensos, marca avaliação veterinária.`;
  }
  if (normalized.includes("aliment") || normalized.includes("nutrição")) {
    return `Para alimentação, mantém horários consistentes, água sempre disponível e mudanças graduais de ração ao longo de 7 a 10 dias. Ajusta a dose à idade, peso, espécie e nível de atividade de ${name}.`;
  }
  if (normalized.includes("veterin")) {
    return `Deves ir ao veterinário se ${name} tiver dificuldade em respirar, convulsões, trauma, intoxicação, dor evidente, apatia marcada, vómitos persistentes, diarreia com sangue, ou recusa de comida/água prolongada. Em situações graves, não esperes.`;
  }
  return `Posso ajudar-te com comportamento, saúde, nutrição e bem-estar de ${name}. Diz-me o que observaste, há quanto tempo acontece e se existem sinais físicos como dor, vómitos, diarreia, apatia ou dificuldade respiratória. Para sintomas sérios, a avaliação veterinária é indispensável.`;
}

export default function MindiPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const revealTimerRef = useRef<number | null>(null);

  const { data: activeAnimal, isLoading: animalLoading } = trpc.animals.getActive.useQuery();
  const recentEventsQuery = trpc.events.listForAnimal.useQuery(
    { animalId: activeAnimal?.id ?? 0, page: 1, pageSize: 5 },
    { enabled: Boolean(activeAnimal?.id) }
  );
  const sendMutation = trpc.chat.send.useMutation();

  const recentEvents = recentEventsQuery.data?.events ?? [];
  const latestStateLabel = recentEvents[0]?.state
    ? STATE_LABELS[recentEvents[0].state as EmotionalState] ?? recentEvents[0].state
    : undefined;

  const welcomeMessage = useMemo<ChatMessage>(
    () => ({
      id: "mindi-welcome",
      role: "assistant",
      content: activeAnimal
        ? `Olá, sou a Mindi. Já tenho o contexto de ${activeAnimal.name} e vou usar o perfil e as últimas classificações para te ajudar.`
        : "Olá, sou a Mindi. Posso ajudar com comportamento, saúde, nutrição e bem-estar animal. Seleciona um animal para eu usar contexto automático.",
    }),
    [activeAnimal]
  );

  const displayMessages = [welcomeMessage, ...messages];
  const isBusy = sendMutation.isPending || isRevealing;
  const hasUserMessages = messages.some((message) => message.role === "user");

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayMessages, isBusy]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearInterval(revealTimerRef.current);
      }
    };
  }, []);

  const revealAssistantMessage = (messageId: string, text: string) => {
    if (revealTimerRef.current !== null) {
      window.clearInterval(revealTimerRef.current);
    }

    setIsRevealing(true);
    let cursor = 0;
    const chunkSize = Math.max(1, Math.ceil(text.length / 90));

    revealTimerRef.current = window.setInterval(() => {
      cursor = Math.min(text.length, cursor + chunkSize);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, content: text.slice(0, cursor) } : message
        )
      );

      if (cursor >= text.length) {
        if (revealTimerRef.current !== null) {
          window.clearInterval(revealTimerRef.current);
          revealTimerRef.current = null;
        }
        setIsRevealing(false);
        inputRef.current?.focus();
      }
    }, 18);
  };

  const sendMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || isBusy) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };
    const assistantId = createMessageId();
    const history = messages
      .filter((message) => message.content.trim().length > 0)
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");

    // Offline: use client-side fallback immediately
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const offlineReply = buildClientFallbackResponse(content, activeAnimal?.name);
      setTimeout(() => revealAssistantMessage(assistantId, offlineReply), 150);
      return;
    }

    try {
      const response = await sendMutation.mutateAsync({
        animalId: activeAnimal?.id,
        message: content,
        history,
      });
      revealAssistantMessage(assistantId, response.reply);
    } catch (error) {
      console.error("[Mindi] Chat request failed:", error);
      setIsRevealing(false);
      // Network failure fallback
      const fallbackReply = buildClientFallbackResponse(content, activeAnimal?.name);
      revealAssistantMessage(assistantId, fallbackReply);
      toast.error("Resposta gerada localmente (modo offline).");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  if (animalLoading) {
    return <AppShellSkeleton mode="content" variant="mindi" />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-lg flex-col px-4 pb-40 pt-5">
      <section className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Chat IA
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Mindi</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A tua assistente de bem-estar animal
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_30px_rgba(16,185,129,0.18)]">
            <Bot className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card/70 p-3 text-xs leading-relaxed text-muted-foreground">
          {getContextSummary(activeAnimal, latestStateLabel)}
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-4">
        {displayMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {!hasUserMessages && (
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => void sendMessage(reply)}
                disabled={isBusy}
                className="rounded-xl border border-border bg-secondary/35 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors active:scale-[0.98] disabled:opacity-60 hover:border-primary/45 hover:bg-primary/10"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        <div ref={scrollRef} />
      </section>

      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            rows={1}
            maxLength={1200}
            placeholder="Pergunta à Mindi..."
            disabled={isBusy}
            className="min-h-11 max-h-32 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-70"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={!input.trim() || isBusy}
            className="h-11 w-11 rounded-2xl"
            aria-label="Enviar mensagem"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
