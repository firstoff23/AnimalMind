import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { GlowingButton } from "@/components/ui/GlowingButton";
import { Mic, Heart, BarChart3, Users, Languages, DownloadCloud, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      <BackgroundGrid className="opacity-40" />

      {/* Decorative top lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Navbar/Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">
            AnimalMind
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <Languages size={14} />
            {language === "pt" ? "EN" : "PT"}
          </Button>
          
          {isAuthenticated ? (
            <GlowingButton onClick={() => setLocation("/dashboard")}>
              {t("landing.dashboard") || "Painel de Controlo"}
            </GlowingButton>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/login")}
              className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 font-semibold"
            >
              {t("landing.login") || "Iniciar Sessão"}
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-16 flex flex-col items-center justify-center text-center space-y-8 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
          <Sparkles size={12} />
          {t("landing.pwaAvailable") || "Disponível para instalar como PWA"}
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          {t("landing.title") || "Compreenda a Mente do Seu Animal"}
        </h1>
        
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          {t("landing.subtitle") || "Monitorização em tempo real do estado emocional e bem-estar do seu companheiro através de Inteligência Artificial acústica."}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
          {isAuthenticated ? (
            <GlowingButton onClick={() => setLocation("/dashboard")} className="px-8 py-6 text-base font-semibold w-full sm:w-auto">
              {t("landing.dashboard") || "Aceder ao Painel"}
            </GlowingButton>
          ) : (
            <>
              <GlowingButton onClick={() => setLocation("/register")} className="px-8 py-6 text-base font-semibold w-full sm:w-auto">
                {t("landing.getStarted") || "Começar Agora"}
              </GlowingButton>
              <Button
                variant="outline"
                onClick={() => setLocation("/login")}
                className="px-8 py-6 text-base font-semibold border-slate-800 hover:bg-slate-900 w-full sm:w-auto"
              >
                {t("landing.login") || "Já tenho conta"}
              </Button>
            </>
          )}
        </div>

        {/* How It Works Section */}
        <section className="w-full pt-20 pb-12 space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t("landing.howItWorks") || "Como Funciona"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="space-y-3 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Mic size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.step1Title") || "1. Grave o Som"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.step1Desc") || "Grave os latidos, miados ou outros sons do seu animal diretamente na aplicação."}
              </p>
            </div>

            <div className="space-y-3 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.step2Title") || "2. Análise de IA"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.step2Desc") || "Os nossos modelos avançados classificam o estado emocional em tempo real com base no som."}
              </p>
            </div>

            <div className="space-y-3 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.step3Title") || "3. Acompanhe a Evolução"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.step3Desc") || "Visualize relatórios, tendências de bem-estar e partilhe o perfil com a sua família."}
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 space-y-12">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t("landing.features") || "Funcionalidades Premium"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SpotlightCard className="flex flex-col text-left p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Heart size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.feat1Title") || "Inteligência Acústica"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.feat1Desc") || "Classificação refinada entre 6 estados emocionais: angústia, excitação, alerta, fome, atenção e relaxamento."}
              </p>
            </SpotlightCard>

            <SpotlightCard className="flex flex-col text-left p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.feat2Title") || "Evolução e Alertas"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.feat2Desc") || "Identificação automática de desvios no comportamento típico (baseline) e alertas preventivos de bem-estar."}
              </p>
            </SpotlightCard>

            <SpotlightCard className="flex flex-col text-left p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-lg">{t("landing.feat3Title") || "Partilha Familiar"}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t("landing.feat3Desc") || "Convide co-tutores para gerir as tarefas de saúde e acompanhar o estado do animal em tempo real."}
              </p>
            </SpotlightCard>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 z-10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AnimalMind. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage("pt")}
              className={cn("hover:text-slate-350 transition-colors", language === "pt" && "text-indigo-400 font-semibold")}
            >
              Português
            </button>
            <span>·</span>
            <button
              onClick={() => setLanguage("en")}
              className={cn("hover:text-slate-350 transition-colors", language === "en" && "text-indigo-400 font-semibold")}
            >
              English
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
