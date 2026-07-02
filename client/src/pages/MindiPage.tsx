import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Bot, Send, Sparkles, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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

function getMessageTextContent(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return (message as any).content || "";
  }
  return message.parts
    .filter((part) => part.type === "text")
    .map((part: any) => part.text)
    .join("\n");
}

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-1 py-2"
      aria-label="Mindi está a responder"
    >
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

function MessagePartRenderer({ part }: { part: any }) {
  if (part.type === "text") {
    return <Streamdown>{part.text}</Streamdown>;
  }

  if (part.type.startsWith("tool-")) {
    const toolName = part.type.substring(5);
    const state = part.state;

    let label = "";
    if (toolName === "getPetProfile") label = "perfil do pet";
    else if (toolName === "getRecentEvents") label = "eventos comportamentais";
    else if (toolName === "getHealthRecords") label = "boletim de saúde";
    else if (toolName === "checkFoodSafety")
      label = `segurança de "${part.input?.foodQuery || "alimento"}"`;
    else if (toolName === "getBreedInfo")
      label = `características da raça "${part.input?.breedName || ""}"`;
    else label = `ferramenta ${toolName}`;

    const isExecuting =
      state === "input-streaming" || state === "input-available";

    return (
      <div className="my-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
        {isExecuting ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <span>🔍 A consultar {label}...</span>
          </>
        ) : state === "output-error" ? (
          <>
            <span className="h-2 w-2 rounded-full bg-destructive"></span>
            <span>❌ Erro ao consultar {label}</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            <span>
              ✅ {label.charAt(0).toUpperCase() + label.slice(1)} consultado
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const hasParts = message.parts && message.parts.length > 0;
  const contentText = getMessageTextContent(message);

  return (
    <div
      className={cn(
        "flex w-full gap-3 animate-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && <MindiAvatar />}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card/95 text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{contentText}</p>
        ) : hasParts ? (
          <div className="prose prose-invert max-w-none text-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
            {message.parts.map((part, index) => (
              <MessagePartRenderer key={index} part={part} />
            ))}
          </div>
        ) : contentText ? (
          <div className="prose prose-invert max-w-none text-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
            <Streamdown>{contentText}</Streamdown>
          </div>
        ) : (
          <TypingIndicator />
        )}
      </div>
    </div>
  );
}

function getContextSummary(
  animal:
    | {
        name?: string;
        species?: string;
        breed?: string | null;
        age?: number | null;
      }
    | null
    | undefined,
  latestState?: string,
) {
  if (!animal) {
    return "Escolhe um animal no Perfil para a Mindi usar contexto automático.";
  }

  const species =
    animal.species === "dog"
      ? "Cão"
      : animal.species === "cat"
        ? "Gato"
        : "Animal";
  const breed = animal.breed || "raça indefinida";
  const age =
    typeof animal.age === "number"
      ? `${animal.age} anos`
      : "idade desconhecida";
  const recent = latestState
    ? `Último estado: ${latestState}.`
    : "Sem histórico recente.";
  return `${animal.name} · ${species} · ${breed} · ${age}. ${recent}`;
}

function buildClientFallbackResponse(
  message: string,
  animalName?: string,
): string {
  const name = animalName || "o teu animal";
  const normalized = message.toLocaleLowerCase("pt-PT");

  if (
    normalized.includes("não come") ||
    normalized.includes("nao come") ||
    normalized.includes("comer")
  ) {
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { session } = useAuth();
  const { data: activeAnimal, isLoading: animalLoading } =
    trpc.animals.getActive.useQuery();

  const recentEventsQuery = trpc.events.listForAnimal.useQuery(
    { animalId: activeAnimal?.id ?? 0, page: 1, pageSize: 5 },
    { enabled: Boolean(activeAnimal?.id) },
  );

  const recentEvents = recentEventsQuery.data?.events ?? [];
  const latestStateLabel = recentEvents[0]?.state
    ? recentEvents[0].state
    : undefined;

  // Initialize Vercel AI SDK useChat
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => ({
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      }),
      body: () => ({
        animalId: activeAnimal?.id,
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Load chat history from IndexedDB
  useEffect(() => {
    async function loadHistory() {
      try {
        const key = `mindi_history_${activeAnimal?.id || "global"}`;
        const saved = await idbGet<UIMessage[]>(key);
        if (saved && Array.isArray(saved)) {
          setMessages(saved);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico do IndexedDB:", err);
      }
    }
    loadHistory();
  }, [activeAnimal?.id, setMessages]);

  // Save chat history to IndexedDB
  useEffect(() => {
    if (messages.length > 0) {
      const key = `mindi_history_${activeAnimal?.id || "global"}`;
      void idbSet(key, messages);
    }
  }, [messages, activeAnimal?.id]);

  const welcomeMessage = useMemo<UIMessage>(
    () =>
      ({
        id: "mindi-welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: activeAnimal
              ? `Olá, sou a Mindi. Já tenho o contexto de ${activeAnimal.name} e vou usar o perfil, boletim de saúde e as últimas classificações para te ajudar.`
              : "Olá, sou a Mindi. Posso ajudar com comportamento, saúde, nutrição e bem-estar animal. Seleciona um animal para eu usar contexto automático.",
          },
        ],
        createdAt: new Date(),
      }) as any,
    [activeAnimal],
  );

  const displayMessages = [welcomeMessage, ...messages];
  const isBusy = status === "submitted" || status === "streaming";
  const hasUserMessages = messages.some((message) => message.role === "user");

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSendMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || isBusy) return;

    // Offline check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const userMsgId = createMessageId();
      const assistantMsgId = createMessageId();
      const offlineReply = buildClientFallbackResponse(
        content,
        activeAnimal?.name,
      );

      const userMsg: UIMessage = {
        id: userMsgId,
        role: "user",
        parts: [{ type: "text", text: content }],
      };

      const assistantMsg: UIMessage = {
        id: assistantMsgId,
        role: "assistant",
        parts: [{ type: "text", text: offlineReply }],
      };

      setMessages((current) => [...current, userMsg, assistantMsg]);
      setInput("");
      toast.info("A responder localmente (modo offline).");
      return;
    }

    try {
      sendMessage({ text: content });
      setInput("");
    } catch (error) {
      console.error("[Mindi] Send message failed:", error);
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleClearHistory = async () => {
    if (
      window.confirm(
        "Tens a certeza que queres limpar o histórico de conversa com a Mindi?",
      )
    ) {
      try {
        setMessages([]);
        const key = `mindi_history_${activeAnimal?.id || "global"}`;
        await idbSet(key, []);
        toast.success("Histórico limpo com sucesso!");
      } catch (err) {
        console.error("Erro ao limpar histórico:", err);
        toast.error("Erro ao limpar histórico.");
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSendMessage(input);
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
              Chat IA Agente
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              Mindi
              {hasUserMessages && (
                <button
                  onClick={handleClearHistory}
                  title="Limpar histórico"
                  className="p-1 hover:text-destructive text-muted-foreground transition-colors ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </h1>
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

        <div ref={scrollRef} />
      </section>

      {!hasUserMessages && (
        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 mb-4">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => void handleSendMessage(reply)}
              disabled={isBusy}
              className="rounded-xl border border-border bg-secondary/35 px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors active:scale-[0.98] disabled:opacity-60 hover:border-primary/45 hover:bg-primary/10"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

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
                void handleSendMessage(input);
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
