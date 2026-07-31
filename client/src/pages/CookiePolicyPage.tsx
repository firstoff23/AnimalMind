import { ArrowLeft, Cookie } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/contexts/AuthContext";

export default function CookiePolicyPage() {
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
            PeloNaRoupa
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
            <Cookie size={12} />
            Política de Cookies
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Política de Cookies
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Esta política explica como a <strong>PeloNaRoupa</strong> utiliza cookies e tecnologias semelhantes para o reconhecer quando visita o nosso website.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. O que são cookies?</h2>
            <p>
              Cookies são pequenos ficheiros de texto que são descarregados para o seu computador ou dispositivo móvel quando visita um website. São amplamente utilizados para fazer com que os websites funcionem, ou funcionem de forma mais eficiente, bem como para fornecer informações aos proprietários do site.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Por que utilizamos cookies?</h2>
            <p>
              Utilizamos cookies por vários motivos. Alguns cookies são necessários por razões técnicas para que o nosso website funcione (designados "cookies essenciais"). Outros cookies permitem-nos monitorizar o desempenho e melhorar a experiência do utilizador.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Tipos de cookies que utilizamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Essenciais:</strong> Necessários para permitir a autenticação do utilizador, a segurança das sessões e o suporte a funcionalidades offline.</li>
              <li><strong>Desempenho e Funcionalidade:</strong> Utilizados para lembrar as suas preferências (como a língua selecionada) e analisar o comportamento da aplicação.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Como posso controlar os cookies?</h2>
            <p>
              Tem o direito de decidir se aceita ou rejeita cookies. Pode gerir as suas preferências de cookies a qualquer momento clicando no link "Preferências de Consentimento" no rodapé das nossas páginas, ou definindo os controlos do seu navegador.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 z-10 bg-slate-950/80 backdrop-blur-md mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} PeloNaRoupa. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
