import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Heart,
  Languages,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { useLocation } from "wouter";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { Button } from "@/components/ui/button";
import { GlowingButton } from "@/components/ui/GlowingButton";
import { Logo } from "@/components/ui/Logo";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div
      className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden font-sans"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <BackgroundGrid className="opacity-30" />

      {/* Ambient glows */}
      <div className="pointer-events-none -z-10 fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/3 w-[600px] h-[600px] bg-indigo-500/8 rounded-full blur-[140px]" />
        <div className="absolute top-[15%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[-5%] w-[350px] h-[350px] bg-purple-500/6 rounded-full blur-[100px]" />
      </div>

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-20 w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-satoshi">
            <Logo size={20} className="text-primary" />
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Pawra
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
              aria-label="Mudar idioma"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Languages size={13} aria-hidden="true" />
              {language === "pt" ? "EN" : "PT"}
            </button>
            {isAuthenticated ? (
              <GlowingButton
                onClick={() => setLocation("/dashboard")}
                className="text-xs px-4 py-2 h-auto"
              >
                {t("landing.dashboard") || "Painel"}
              </GlowingButton>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/login")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8 rounded-lg"
              >
                {t("landing.login") || "Entrar"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <main id="main-content" className="flex-1">
        <section className="w-full max-w-5xl mx-auto px-5 pt-16 pb-20 flex flex-col items-center text-center gap-6">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Sparkles size={11} aria-hidden="true" />
            {language === "pt"
              ? "Inteligência Artificial · Pawra"
              : "Powered by AI · Pawra"}
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-3xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Compreenda o seu{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              animal
            </span>{" "}
            através do som.
          </h1>

          {/* Sub-headline */}
          <p
            className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            {t("landing.subtitle") ||
              "Monitorização em tempo real do estado emocional do seu companheiro com IA acústica — offline, privado e sempre consigo."}
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            {isAuthenticated ? (
              <GlowingButton
                onClick={() => setLocation("/dashboard")}
                className="px-8 py-3 text-sm font-semibold w-full sm:w-auto rounded-xl"
              >
                <span className="flex items-center gap-2">
                  {t("landing.dashboard") || "Abrir Painel"}{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </GlowingButton>
            ) : (
              <>
                <GlowingButton
                  onClick={() => setLocation("/register")}
                  className="px-8 py-3 text-sm font-semibold w-full sm:w-auto rounded-xl"
                >
                  <span className="flex items-center gap-2">
                    {t("landing.getStarted") || "Começar gratuitamente"}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </GlowingButton>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="px-8 py-3 text-sm font-semibold border-slate-700 hover:bg-slate-800/60 w-full sm:w-auto rounded-xl h-auto"
                >
                  {t("landing.login") || "Já tenho conta"}
                </Button>
              </>
            )}
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {[
              { icon: ShieldCheck, label: "100% privado" },
              { icon: Wifi, label: "Funciona offline" },
              { icon: CheckCircle2, label: "Gratuito para começar" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-full px-3 py-1"
              >
                <Icon
                  size={11}
                  className="text-emerald-400"
                  aria-hidden="true"
                />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="w-full max-w-5xl mx-auto px-5 py-16 space-y-10">
          <div className="text-center space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t("landing.howItWorks") || "Como Funciona"}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Três passos simples para compreender melhor o seu animal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {[
              {
                step: "01",
                icon: Mic,
                color: "indigo",
                title: t("landing.step1Title") || "Grave o Som",
                desc:
                  t("landing.step1Desc") ||
                  "Grave os latidos, miados ou outros sons do seu animal diretamente na aplicação, em 3 segundos.",
              },
              {
                step: "02",
                icon: Sparkles,
                color: "purple",
                title: t("landing.step2Title") || "Análise por IA",
                desc:
                  t("landing.step2Desc") ||
                  "Modelos de redes neuronais classificam o estado emocional em tempo real — mesmo sem internet.",
              },
              {
                step: "03",
                icon: BarChart3,
                color: "emerald",
                title: t("landing.step3Title") || "Acompanhe a Evolução",
                desc:
                  t("landing.step3Desc") ||
                  "Visualize relatórios, tendências de bem-estar e partilhe o perfil com a sua família.",
              },
            ].map(({ step, icon: Icon, color, title, desc }) => (
              <div
                key={step}
                className={cn(
                  "relative space-y-4 rounded-2xl p-6 border transition-colors",
                  "bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80",
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      color === "indigo" && "bg-indigo-500/10 text-indigo-400",
                      color === "purple" && "bg-purple-500/10 text-purple-400",
                      color === "emerald" &&
                        "bg-emerald-500/10 text-emerald-400",
                    )}
                  >
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <span className="text-4xl font-black text-slate-800 select-none">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-base">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="w-full max-w-5xl mx-auto px-5 py-10 space-y-10">
          <div className="text-center space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t("landing.features") || "Funcionalidades Premium"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Heart,
                color: "rose",
                title: t("landing.feat1Title") || "Inteligência Acústica",
                desc:
                  t("landing.feat1Desc") ||
                  "Classificação entre 6 estados emocionais: angústia, excitação, alerta, fome, atenção e relaxamento.",
              },
              {
                icon: Sparkles,
                color: "amber",
                title: t("landing.feat2Title") || "Evolução e Alertas",
                desc:
                  t("landing.feat2Desc") ||
                  "Identificação automática de desvios no comportamento típico e alertas preventivos de bem-estar.",
              },
              {
                icon: Users,
                color: "cyan",
                title: t("landing.feat3Title") || "Partilha Familiar",
                desc:
                  t("landing.feat3Desc") ||
                  "Convide co-tutores para gerir as tarefas de saúde e acompanhar o estado do animal em tempo real.",
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <SpotlightCard
                key={title}
                className="flex flex-col text-left p-6 space-y-3"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    color === "rose" && "bg-rose-500/10 text-rose-400",
                    color === "amber" && "bg-amber-500/10 text-amber-400",
                    color === "cyan" && "bg-cyan-500/10 text-cyan-400",
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-base">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* ── SCIENTIFIC HONESTY ── */}
        <section className="w-full max-w-3xl mx-auto px-5 py-10">
          <div className="p-5 rounded-2xl bg-amber-500/8 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
                ⚠️
              </span>
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-amber-400">
                  Honestidade Científica &amp; Limitações
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O <strong className="text-slate-300">Pawra</strong>{" "}
                  utiliza o modelo{" "}
                  <strong className="text-slate-300">YAMNet</strong>{" "}
                  (classificador genérico de eventos de áudio) para estimar
                  estados emocionais como aproximações comportamentais. Os
                  resultados devem ser interpretados como{" "}
                  <strong className="text-slate-300">sinais ou indícios</strong>{" "}
                  — nunca como diagnóstico. Esta aplicação{" "}
                  <strong className="text-slate-300">
                    não substitui avaliação veterinária profissional
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="w-full max-w-4xl mx-auto px-5 py-16 space-y-10 border-t border-slate-800/50">
          <div className="text-center space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Perguntas Frequentes
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Esclareça as suas dúvidas sobre o funcionamento e privacidade do
              Pawra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {[
              {
                q: "Como funciona a classificação acústica?",
                a: "Utilizamos redes neuronais para analisar frequências, tom e intensidade das vocalizações, estimando o estado emocional do animal de forma científica.",
              },
              {
                q: "A classificação é 100% precisa?",
                a: "Não. A plataforma fornece estimativas indicativas com base em padrões sonoros. Não substitui um diagnóstico efetuado por médico veterinário.",
              },
              {
                q: "Como é protegida a minha privacidade?",
                a: "Os ficheiros de áudio são guardados em armazenamento totalmente privado no Supabase e acedidos via URLs assinadas e temporárias. Pode apagar os registos a qualquer momento.",
              },
              {
                q: "O que é a baseline do animal?",
                a: "A baseline é o perfil de comportamento habitual do seu animal. A nossa IA calcula as reações normais para detetar mudanças que possam indicar desconforto ou stresse.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="space-y-2 bg-slate-900/30 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition-colors"
              >
                <h3 className="font-bold text-sm text-slate-200">{q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        {!isAuthenticated && (
          <section className="w-full max-w-2xl mx-auto px-5 py-16 text-center space-y-6">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Pronto para conhecer melhor o seu animal?
            </h2>
            <p className="text-sm text-slate-400">
              Gratuito, sem cartão de crédito. Instale como app no seu
              telemóvel.
            </p>
            <GlowingButton
              onClick={() => setLocation("/register")}
              className="px-10 py-3.5 text-sm font-semibold rounded-xl mx-auto"
            >
              <span className="flex items-center gap-2">
                Começar agora <ArrowRight size={15} aria-hidden="true" />
              </span>
            </GlowingButton>
          </section>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full border-t border-slate-800/60 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p>
              © {new Date().getFullYear()} Pawra. Todos os direitos
              reservados.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/privacidade")}
                className="hover:text-slate-300 transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Política de Privacidade
              </button>
              <span aria-hidden="true">·</span>
              <a
                href="mailto:suporte@pawra.app"
                className="hover:text-slate-300 transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Suporte
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage("pt")}
              aria-pressed={language === "pt"}
              className={cn(
                "hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:underline",
                language === "pt" && "text-indigo-400 font-semibold",
              )}
            >
              Português
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={cn(
                "hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:underline",
                language === "en" && "text-indigo-400 font-semibold",
              )}
            >
              English
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
