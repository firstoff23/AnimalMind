import {
  ArrowLeft,
  Eye,
  Globe,
  Key,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleBack = () => {
    if (isAuthenticated) {
      setLocation("/definicoes");
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      <BackgroundGrid className="opacity-40" />

      {/* Decorative top lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 z-10">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setLocation(isAuthenticated ? "/dashboard" : "/")}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Logo className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-200 bg-clip-text text-transparent">
            Pawra
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-slate-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {isAuthenticated ? "Voltar às Definições" : "Voltar à Landing"}
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 space-y-8 z-10">
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck size={12} />
            Privacidade e Segurança RGPD
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Na <strong>Pawra</strong>, a proteção da sua privacidade e dos dados
            do seu animal de estimação é a nossa prioridade número um. Esta
            Política de Privacidade explica de forma clara e transparente como
            recolhemos, tratamos e protegemos os seus dados pessoais, em total
            conformidade com o Regulamento Geral sobre a Proteção de Dados
            (RGPD).
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {/* 1. Responsável pelo Tratamento */}
          <AccordionItem
            value="item-1"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <UserCheck size={16} />
              </div>
              <span>1. Responsável pelo Tratamento</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                O responsável pelo tratamento dos dados recolhidos através desta
                aplicação é:
              </p>
              <div className="p-3 bg-slate-900/50 rounded-xl border border-border/50 text-slate-350">
                <p>
                  <strong>Entidade:</strong> Pawra App
                </p>
                <p>
                  <strong>Responsável pelo Tratamento:</strong> Pawra
                </p>
                <p>
                  <strong>Contacto do Encarregado:</strong> alexinacio2006@gmail.com
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Dados Recolhidos */}
          <AccordionItem
            value="item-2"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Eye size={16} />
              </div>
              <span>2. Dados Recolhidos</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                Recolhemos e tratamos apenas os dados estritamente necessários
                para prestar os nossos serviços de análise comportamental e
                registo de saúde animal:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-350">
                <li>
                  <strong>Dados do Tutor:</strong> Nome completo e endereço de
                  correio eletrónico (email).
                </li>
                <li>
                  <strong>Dados de Perfil do Animal:</strong> Nome, espécie (cão
                  ou gato), raça, idade, peso e fotografia de perfil.
                </li>
                <li>
                  <strong>Dados de Análise Acústica:</strong> Gravações curtas
                  de áudio de vocalizações de animais (para tradução e
                  categorização emocional).
                </li>
                <li>
                  <strong>Dados Visuais / Câmara:</strong> Capturas ou fluxos de
                  vídeo no ecrã da câmara local (para processamento de pontos de
                  postura corporal).
                </li>
                <li>
                  <strong>Dados Clínicos:</strong> Histórico de vacinas,
                  desparasitações, consultas veterinárias e sintomas registados.
                </li>
                <li>
                  <strong>Dados de Localização:</strong> Se aplicável, a
                  localização geográfica aproximada obtida com consentimento
                  (para sugerir clínicas veterinárias próximas).
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Finalidade do Tratamento */}
          <AccordionItem
            value="item-3"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Globe size={16} />
              </div>
              <span>3. Finalidade do Tratamento</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                Os seus dados são tratados para as seguintes finalidades
                legítimas:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-350">
                <li>
                  Prestar o serviço de tradução acústica e análise de emoções e
                  humor consolidado (POMDP).
                </li>
                <li>
                  Gerir o boletim de saúde preventivo (vacinação e histórico
                  clínico) e emitir alertas relevantes.
                </li>
                <li>
                  Permitir a partilha de perfis comportamentais com outros
                  membros da família (Modo Família) ou profissionais médicos
                  (Modo Veterinário).
                </li>
                <li>
                  Melhorar os nossos modelos locais e algoritmos de inferência
                  baseados em inteligência artificial.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Base Jurídica */}
          <AccordionItem
            value="item-4"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <ShieldAlert size={16} />
              </div>
              <span>4. Base Jurídica do Tratamento</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-1">
              <p>
                A base jurídica para o tratamento dos dados é o{" "}
                <strong>consentimento explícito</strong> do utilizador (ao
                abrigo do <strong>Artigo 6.º, n.º 1, alínea a) do RGPD</strong>
                ), concedido no momento do registo de conta e ao autorizar o uso
                do microfone e da câmara do dispositivo nas páginas de captura.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Alojamento e Segurança dos Dados */}
          <AccordionItem
            value="item-5"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Lock size={16} />
              </div>
              <span>5. Alojamento e Segurança</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                Garantimos os mais elevados padrões de segurança para
                salvaguardar a integridade dos seus dados:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-350">
                <li>
                  <strong>Localização:</strong> Os dados são alojados de forma
                  segura nos servidores da plataforma <strong>Supabase</strong>,
                  localizados na União Europeia (região <code>eu-west</code> /
                  Frankfurt).
                </li>
                <li>
                  <strong>Cifragem:</strong> Todos os dados transmitidos são
                  cifrados em trânsito (protocolo HTTPS/SSL) e armazenados com
                  cifragem avançada em repouso (AES-256).
                </li>
                <li>
                  <strong>Restrição:</strong> Implementação de políticas
                  rigorosas de Row Level Security (RLS) no Supabase, assegurando
                  que nenhum utilizador ou terceiros não autorizados possam ver
                  ou modificar os dados dos seus animais.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Direitos do Utilizador */}
          <AccordionItem
            value="item-6"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Key size={16} />
              </div>
              <span>6. Direitos do Utilizador</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                Como titular de dados pessoais, o RGPD garante-lhe os seguintes
                direitos fundamentais:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-350">
                <li>
                  <strong>Direito de Acesso:</strong> Obter confirmação e cópia
                  dos dados pessoais que tratamos.
                </li>
                <li>
                  <strong>Direito de Retificação:</strong> Corrigir dados
                  incorretos ou incompletos no seu perfil.
                </li>
                <li>
                  <strong>Direito ao Apagamento ("Esquecimento"):</strong>{" "}
                  Eliminar permanentemente todos os dados da plataforma.
                </li>
                <li>
                  <strong>Direito à Portabilidade:</strong> Exportar o seu
                  histórico em formato estruturado (CSV e PDF).
                </li>
                <li>
                  <strong>Direito de Oposição / Limitação:</strong> Opor-se a
                  tratamentos específicos ou solicitar a suspensão temporária do
                  tratamento.
                </li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Para exercer qualquer um destes direitos, poderá contactar-nos
                diretamente através do endereço de correio eletrónico:{" "}
                <strong className="text-primary">
                  alexinacio2006@gmail.com
                </strong>
                .
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Retenção e Apagamento de Dados */}
          <AccordionItem
            value="item-7"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Trash2 size={16} />
              </div>
              <span>7. Retenção e Apagamento</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-2">
              <p>
                Os seus dados são retidos enquanto a sua conta de utilizador
                estiver ativa.
              </p>
              <p>
                Se optar por acionar a opção <strong>"Apagar Conta"</strong> na
                secção de Definições, o sistema apagará de imediato e em cascata
                todos os registos das tabelas do servidor e eliminará as
                gravações de áudio do Supabase Storage. O registo de
                autenticação do utilizador será programado para remoção
                definitiva do Supabase Auth num prazo máximo de{" "}
                <strong>30 dias</strong> após a solicitação.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Cookies e LocalStorage */}
          <AccordionItem
            value="item-8"
            className="border border-border bg-card/40 rounded-2xl px-4 overflow-hidden"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-sm font-bold flex items-center gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Globe size={16} />
              </div>
              <span>8. Cookies e LocalStorage</span>
            </AccordionTrigger>
            <AccordionContent className="text-slate-400 text-xs sm:text-sm leading-relaxed pb-4 pt-1 space-y-1">
              <p>
                Utilizamos cookies de sessão e a tecnologia{" "}
                <code>localStorage</code> do navegador única e exclusivamente
                para fins funcionais (guardar a preferência de idioma, o estado
                de consentimento do onboarding e persistir temporariamente dados
                para funcionamento em modo offline).{" "}
                <strong>
                  Não utilizamos quaisquer cookies de rastreio (tracking),
                  marketing ou análise comportamental de terceiros.
                </strong>
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 text-center space-y-4 max-w-lg mx-auto mt-6">
          <Mail className="w-8 h-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold text-foreground">
            Dúvidas ou Questões?
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se tiver qualquer dúvida sobre o tratamento dos seus dados ou quiser
            exercer os seus direitos de privacidade, envie-nos uma mensagem por
            correio eletrónico.
          </p>
          <a
            href="mailto:alexinacio2006@gmail.com"
            className="inline-block text-xs font-semibold text-primary hover:underline"
          >
            alexinacio2006@gmail.com
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 z-10 bg-slate-950/80 backdrop-blur-md mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} Pawra. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setLocation("/termos")}
              className="hover:text-slate-300 transition-colors font-medium focus-visible:outline-none focus-visible:underline"
            >
              Termos de Uso
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              onClick={() => setLocation("/cookies")}
              className="hover:text-slate-300 transition-colors font-medium focus-visible:outline-none focus-visible:underline"
            >
              Política de Cookies
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              onClick={() => {
                const w = window as any;
                if (w.displayPreferenceModal) {
                  w.displayPreferenceModal();
                } else if (w.Termly) {
                  w.Termly.showConsentModal();
                }
              }}
              className="hover:text-slate-300 transition-colors font-medium text-emerald-400 focus-visible:outline-none focus-visible:underline"
            >
              Consentimento
            </button>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-[10px] text-muted-foreground">
              Última atualização: Junho de 2026
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
