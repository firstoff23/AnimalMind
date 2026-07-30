import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/contexts/AuthContext";

export default function TermsOfUsePage() {
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
            <ShieldAlert size={12} />
            Termos de Uso
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Ao aceder e utilizar o <strong>Pawra</strong>, aceita cumprir e ficar vinculado aos seguintes Termos de Uso.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao utilizar a nossa plataforma, declara ter pelo menos 18 anos de idade ou ter o consentimento dos pais ou responsáveis para utilizar o serviço. Se não concordar com qualquer parte destes termos, não deve utilizar os nossos serviços.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Uso do Serviço</h2>
            <p>
              O Pawra disponibiliza um sistema de tradução acústica e análise de bem-estar para animais de estimação. O serviço destina-se a fins puramente recreativos e de acompanhamento informal. Não substitui, em caso algum, consultas ou diagnósticos médicos veterinários.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Registo de Conta</h2>
            <p>
              Para utilizar certas funcionalidades, é necessário criar uma conta fornecendo dados verídicos e manter a confidencialidade da sua senha de acesso. É responsável por todas as atividades que ocorrem sob a sua conta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Limitação de Responsabilidade</h2>
            <p>
              O Pawra não garante a exatidão absoluta dos diagnósticos ou traduções gerados pelas suas redes neuronais e não se responsabiliza por quaisquer decisões de saúde ou bem-estar tomadas com base nas informações facultadas pela plataforma.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 z-10 bg-slate-950/80 backdrop-blur-md mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Pawra. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
