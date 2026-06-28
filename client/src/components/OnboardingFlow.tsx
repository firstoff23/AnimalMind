import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { 
  Mic, 
  Sparkles, 
  Heart, 
  Bell, 
  Shield, 
  ArrowRight, 
  Check, 
  PawPrint,
  Volume2
} from "lucide-react";

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Permission statuses
  const [micStatus, setMicStatus] = useState<PermissionState>("prompt");
  const [notiStatus, setNotiStatus] = useState<PermissionState>("prompt");

  // tRPC mutation to complete onboarding
  const completeOnboardingMutation = trpc.auth.completeOnboarding.useMutation({
    onSuccess: async () => {
      // Invalidate the auth.me query to update the state globally
      await utils.auth.me.invalidate();
      // Redirect to the dashboard
      setLocation("/dashboard");
    }
  });

  // Query permissions on mount
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.permissions || !navigator.permissions.query) return;

    navigator.permissions.query({ name: "microphone" as any }).then((result) => {
      setMicStatus(result.state);
      result.onchange = () => setMicStatus(result.state);
    }).catch(() => {});

    navigator.permissions.query({ name: "notifications" as any }).then((result) => {
      setNotiStatus(result.state);
      result.onchange = () => setNotiStatus(result.state);
    }).catch(() => {});
  }, []);

  const handleRequestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus("granted");
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.warn("Microphone permission denied:", err);
      setMicStatus("denied");
    }
  };

  const handleRequestNotifications = async () => {
    try {
      const result = await Notification.requestPermission();
      setNotiStatus(result === "default" ? "prompt" : result);
    } catch (err) {
      console.warn("Notifications permission denied:", err);
      setNotiStatus("denied");
    }
  };

  const handleFinish = async () => {
    try {
      await completeOnboardingMutation.mutateAsync();
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      // Fallback redirect just in case
      setLocation("/dashboard");
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Framer Motion variants for slide transition
  const slideVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 300 : -300,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: "easeOut" as const },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -300 : 300,
      transition: { duration: 0.25, ease: "easeIn" as const },
    }),
  };

  const [direction, setDirection] = useState(1);

  const handleStepChange = (newStep: number) => {
    setDirection(newStep > currentStep ? 1 : -1);
    setCurrentStep(newStep);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-neutral-950 text-neutral-100 overflow-hidden font-satoshi selection:bg-primary selection:text-primary-foreground p-6 md:p-12">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Logo size={28} className="text-primary animate-pulse" />
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Pawra
          </span>
        </div>
        {currentStep < 3 && (
          <button
            onClick={() => handleStepChange(3)}
            className="text-sm font-medium text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Saltar
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center w-full max-w-xl mx-auto z-10 py-8 relative">
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 0 && (
            <motion.div
              key="step0"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Animated Welcome Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="relative flex items-center justify-center w-36 h-36 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl mb-8"
              >
                <Logo size={72} className="text-primary" />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-neutral-950 p-2 rounded-full shadow-lg">
                  <Sparkles size={16} />
                </div>
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Bem-vindo ao{" "}
                <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  Pawra
                </span>
              </h1>
              <p className="text-neutral-400 text-lg leading-relaxed mb-10 max-w-sm">
                Entende o teu pet com IA. Descobre o que os sons do teu companheiro significam em segundos.
              </p>

              <Button
                onClick={() => handleStepChange(1)}
                className="w-full max-w-xs h-12 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200"
              >
                Começar
              </Button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Pet Illustration / Animation */}
              <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 text-primary shadow-xl">
                  <PawPrint size={44} className="animate-pulse text-emerald-400" />
                </div>
                <div className="absolute top-2 right-2 bg-neutral-900 border border-neutral-800 p-2 rounded-full text-neutral-400">
                  <Volume2 size={16} />
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                Conhece o teu animal
              </h2>
              <p className="text-neutral-400 text-base leading-relaxed mb-8 max-w-md">
                Cada cão e gato tem vocalizações únicas. O Pawra analisa o tom e a acústica para criar um perfil emocional detalhado do teu pet, ajudando-te a responder às suas necessidades reais.
              </p>

              <div className="w-full flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="h-12 px-6 rounded-xl border-neutral-800 hover:bg-neutral-900"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => handleStepChange(2)}
                  className="flex-1 max-w-[200px] h-12 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col w-full"
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-2">
                Como funciona
              </h2>
              <p className="text-neutral-400 text-sm text-center mb-8 max-w-sm mx-auto">
                Três passos simples para traduzir a linguagem do teu pet.
              </p>

              {/* Sequential Steps Cards */}
              <div className="space-y-4 mb-8">
                {[
                  {
                    icon: Mic,
                    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    title: "1. Grava",
                    desc: "Regista um som curto (latido, miado, ganido) do teu pet diretamente na app."
                  },
                  {
                    icon: Sparkles,
                    color: "bg-primary/10 text-primary border-primary/20",
                    title: "2. Analisa",
                    desc: "A nossa IA avançada processa a acústica em tempo real comparando com a base científica."
                  },
                  {
                    icon: Heart,
                    color: "bg-red-500/10 text-red-400 border-red-500/20",
                    title: "3. Entende",
                    desc: "Descobre as emoções do teu pet (alerta, fome, afeto) e recebe conselhos úteis."
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.15, duration: 0.3 }}
                    >
                      <SpotlightCard className="flex items-start gap-4 border-neutral-900 bg-neutral-950 p-4">
                        <div className={`p-3 rounded-xl border ${item.color}`}>
                          <Icon size={20} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-neutral-200">{item.title}</h4>
                          <p className="text-xs leading-relaxed text-neutral-400">{item.desc}</p>
                        </div>
                      </SpotlightCard>
                    </motion.div>
                  );
                })}
              </div>

              <div className="w-full flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="h-12 px-6 rounded-xl border-neutral-800 hover:bg-neutral-900"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => handleStepChange(3)}
                  className="flex-1 max-w-[200px] h-12 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col w-full"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-primary mx-auto mb-6">
                <Shield size={32} />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-2">
                Configura as permissões
              </h2>
              <p className="text-neutral-400 text-sm text-center mb-8 max-w-sm mx-auto">
                Ativa o microfone e as notificações para tirar o máximo partido do Pawra.
              </p>

              {/* Permission Buttons / Indicators */}
              <div className="space-y-4 mb-8">
                {/* Microphone Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-neutral-900 bg-neutral-950">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Mic size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-200">Microfone</h4>
                      <p className="text-xs text-neutral-400 max-w-[220px] md:max-w-xs leading-relaxed">
                        Necessário para gravar as vocalizações de cães e gatos.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={micStatus === "granted" ? "outline" : "default"}
                    onClick={handleRequestMic}
                    className={`h-9 px-4 rounded-lg font-bold text-xs ${
                      micStatus === "granted" 
                        ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400" 
                        : "bg-primary text-primary-foreground hover:bg-primary/95"
                    }`}
                    disabled={micStatus === "granted"}
                  >
                    {micStatus === "granted" ? (
                      <span className="flex items-center gap-1"><Check size={12} /> Ativo</span>
                    ) : (
                      "Ativar"
                    )}
                  </Button>
                </div>

                {/* Notifications Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-neutral-900 bg-neutral-950">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Bell size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-200">Notificações</h4>
                      <p className="text-xs text-neutral-400 max-w-[220px] md:max-w-xs leading-relaxed">
                        Alertas instantâneos de comportamento e saúde do teu pet.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={notiStatus === "granted" ? "outline" : "default"}
                    onClick={handleRequestNotifications}
                    className={`h-9 px-4 rounded-lg font-bold text-xs ${
                      notiStatus === "granted" 
                        ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400" 
                        : "bg-primary text-primary-foreground hover:bg-primary/95"
                    }`}
                    disabled={notiStatus === "granted"}
                  >
                    {notiStatus === "granted" ? (
                      <span className="flex items-center gap-1"><Check size={12} /> Ativo</span>
                    ) : (
                      "Ativar"
                    )}
                  </Button>
                </div>
              </div>

              <div className="w-full flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="h-12 px-6 rounded-xl border-neutral-800 hover:bg-neutral-900"
                  disabled={completeOnboardingMutation.isPending}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={completeOnboardingMutation.isPending}
                  className="flex-1 max-w-[200px] h-12 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200"
                >
                  {completeOnboardingMutation.isPending ? "A entrar..." : "Permitir e Entrar"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Step Indicator & Progress */}
      <div className="w-full max-w-xs mx-auto flex items-center justify-between z-10 pb-4">
        {/* Step dots */}
        <div className="flex gap-2 mx-auto">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              onClick={() => handleStepChange(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep ? "w-6 bg-primary" : "w-2 bg-neutral-800 hover:bg-neutral-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
