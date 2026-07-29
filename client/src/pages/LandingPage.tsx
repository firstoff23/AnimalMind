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
import { Button } from "@/components/ui/button";

import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div
      className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden font-sans"
    >


      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-20 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={20} className="text-primary" />
            <span className="text-base font-bold tracking-tight text-foreground">
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
              <Button
                onClick={() => setLocation("/dashboard")}
                className="text-xs px-4 py-2 h-auto"
              >
                {t("landing.dashboard") || "Painel"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/login")}
                className="text-xs h-8 rounded-lg"
              >
                {t("landing.login") || "Entrar"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <main id="main-content" className="flex-1">
        <section className="w-full max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start text-left gap-6">

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t("landing.title")}
            </h1>

            {/* Sub-headline */}
            <p
              className="text-lg text-muted-foreground max-w-xl leading-relaxed"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              {t("landing.subtitle")}
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => setLocation("/dashboard")}
                  className="px-8"
                >
                  <span className="flex items-center gap-2">
                    {t("landing.dashboard") || "Abrir Painel"}{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => setLocation("/register")}
                    className="px-8"
                  >
                    <span className="flex items-center gap-2">
                      {t("landing.getStarted") || "Começar gratuitamente"}{" "}
                      <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setLocation("/login")}
                    className="px-8"
                  >
                    {t("landing.login") || "Já tenho conta"}
                  </Button>
                </>
              )}
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap items-center justify-start gap-4 pt-6">
              {[
                { icon: ShieldCheck, label: "100% privado" },
                { icon: Wifi, label: "Funciona offline" },
                { icon: CheckCircle2, label: "Gratuito para começar" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-2 text-xs text-muted-foreground font-medium"
                >
                  <Icon
                    size={14}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
          
          <div className="hidden lg:block relative w-full h-[500px] rounded-3xl overflow-hidden bg-secondary">
            <img
              src="https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=1200"
              srcSet="
                https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=600 600w,
                https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=900 900w,
                https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=1200 1200w
              "
              sizes="(max-width: 1024px) 0px, 50vw"
              alt="Gato olhando curiosamente"
              className="object-cover w-full h-full opacity-90"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="w-full max-w-7xl mx-auto px-5 py-24 space-y-12">
          <div className="text-center space-y-3">
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t("landing.howItWorks") || "Como Funciona"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Três passos simples para compreender melhor o seu animal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                step: "01",
                icon: Mic,
                title: t("landing.step1Title") || "Grave o Som",
                desc:
                  t("landing.step1Desc") ||
                  "Grave os latidos, miados ou outros sons do seu animal diretamente na aplicação, em 3 segundos.",
              },
              {
                step: "02",
                icon: Sparkles,
                title: t("landing.step2Title") || "Análise por IA",
                desc:
                  t("landing.step2Desc") ||
                  "Modelos de redes neuronais classificam o estado emocional em tempo real — mesmo sem internet.",
              },
              {
                step: "03",
                icon: BarChart3,
                title: t("landing.step3Title") || "Acompanhe a Evolução",
                desc:
                  t("landing.step3Desc") ||
                  "Visualize relatórios, tendências de bem-estar e partilhe o perfil com a sua família.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="relative space-y-4 rounded-3xl p-8 border border-border bg-card transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-secondary text-primary">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <span className="text-5xl font-black text-muted select-none">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCIENTIFIC HONESTY ── */}
        <section className="w-full max-w-3xl mx-auto px-5 py-12">
          <div className="p-6 rounded-3xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-start gap-4">
            <span className="text-2xl shrink-0" aria-hidden="true">
              ⚠️
            </span>
            <div className="space-y-2">
              <h3 className="font-bold text-foreground">
                {t("landing.disclaimerTitle")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.disclaimerDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="w-full max-w-4xl mx-auto px-5 py-24 space-y-12 border-t border-border">
          <div className="text-center space-y-3">
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Esclareça as suas dúvidas sobre o funcionamento e privacidade do
              Pawra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
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
                className="space-y-3 bg-card border border-border rounded-2xl p-6 hover:shadow-sm transition-all"
              >
                <h3 className="font-bold text-foreground">{q}</h3>
                <p className="text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        {!isAuthenticated && (
          <section className="w-full max-w-3xl mx-auto px-5 py-24 text-center space-y-8">
            <h2
              className="text-4xl sm:text-5xl font-bold"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Pronto para conhecer melhor o seu animal?
            </h2>
            <p className="text-lg text-muted-foreground">
              Gratuito, sem cartão de crédito. Instale como app no seu
              telemóvel.
            </p>
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="px-10 py-6 text-base font-semibold rounded-2xl mx-auto"
            >
              <span className="flex items-center gap-2">
                Começar agora <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Button>
          </section>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-5 py-10 flex flex-col lg:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <p className="font-medium">
              © {new Date().getFullYear()} Pawra. Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2">
              <button
                onClick={() => setLocation("/privacidade")}
                className="hover:text-foreground transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Política de Privacidade
              </button>
              <span aria-hidden="true" className="text-border">·</span>
              <button
                onClick={() => setLocation("/termos")}
                className="hover:text-foreground transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Termos de Uso
              </button>
              <span aria-hidden="true" className="text-border">·</span>
              <button
                onClick={() => setLocation("/cookies")}
                className="hover:text-foreground transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Política de Cookies
              </button>
              <span aria-hidden="true" className="text-border">·</span>
              <button
                onClick={() => {
                  const w = window as any;
                  if (w.displayPreferenceModal) {
                    w.displayPreferenceModal();
                  } else if (w.Termly) {
                    w.Termly.showConsentModal();
                  } else {
                    toast.info("Termly consent window is initializing...");
                  }
                }}
                className="hover:text-primary transition-colors font-medium focus-visible:outline-none focus-visible:underline"
              >
                Preferências de Consentimento
              </button>
              <span aria-hidden="true" className="text-border">·</span>
              <a
                href="mailto:suporte@pawra.app"
                className="hover:text-foreground transition-colors font-medium focus-visible:outline-none focus-visible:underline"
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
                "hover:text-foreground transition-colors focus-visible:outline-none focus-visible:underline",
                language === "pt" && "text-primary font-semibold",
              )}
            >
              Português
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={cn(
                "hover:text-foreground transition-colors focus-visible:outline-none focus-visible:underline",
                language === "en" && "text-primary font-semibold",
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
