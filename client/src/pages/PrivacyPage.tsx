import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { ArrowLeft, ShieldCheck, Database, Trash2, Mic, FileText } from "lucide-react";

export default function PrivacyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      <BackgroundGrid className="opacity-40" />

      {/* Decorative top lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">
            AnimalMind
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-slate-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar à Landing
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 space-y-8 z-10">
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck size={12} />
            Privacidade e Segurança
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Na AnimalMind, a privacidade e a segurança dos dados do utilizador e dos seus animais são a nossa prioridade. 
            Esta página descreve de forma clara e transparente as nossas práticas de tratamento de dados.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* O que recolhemos */}
          <Card className="bg-slate-900/40 border-slate-800 shadow-md backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Database size={20} />
              </div>
              <CardTitle className="text-xl font-bold text-slate-100">O que se recolhe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-slate-350 text-sm leading-relaxed">
              <p>
                Recolhemos as seguintes informações para possibilitar o funcionamento da plataforma e a melhoria dos modelos de classificação:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dados do Perfil:</strong> Nome, email e preferências de conta do utilizador.</li>
                <li><strong>Dados do Animal:</strong> Nome, espécie, raça, idade e baselines comportamentais.</li>
                <li><strong>Gravações de Áudio:</strong> Ficheiros de áudio contendo vocalizações que grava ativamente para análise.</li>
                <li><strong>Metadados de Análise:</strong> Resultados da classificação, data/hora do registo e feedback manual fornecido.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Por quanto tempo se guarda */}
          <Card className="bg-slate-900/40 border-slate-800 shadow-md backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <CardTitle className="text-xl font-bold text-slate-100">Por quanto tempo se guarda</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-350 text-sm leading-relaxed">
              <p>
                Todos os dados e gravações de áudio associados ao seu perfil são mantidos **apenas pelo tempo estritamente necessário** 
                enquanto a sua conta se mantiver ativa.
              </p>
              <p className="mt-2">
                Os ficheiros de áudio armazenados no nosso armazenamento privado expiram automaticamente ou são eliminados em conjunto 
                com as suas respetivas gravações. Se desejar, pode remover registos específicos do seu histórico a qualquer momento.
              </p>
            </CardContent>
          </Card>

          {/* Como apagar dados */}
          <Card className="bg-slate-900/40 border-slate-800 shadow-md backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <CardTitle className="text-xl font-bold text-slate-100">Como apagar dados</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-350 text-sm leading-relaxed">
              <p>
                Tem controlo total sobre as suas informações:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Pode apagar gravações individuais diretamente a partir da página de **Histórico**.</li>
                <li>Pode eliminar perfis de animais diretamente na página de detalhes do respetivo animal.</li>
                <li>Para apagar permanentemente a sua conta e todos os dados associados (incluindo áudio e registos), pode fazê-lo nas **Definições da Aplicação** ou entrar em contacto connosco diretamente.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Aviso sobre Captação de Áudio */}
          <Card className="bg-slate-900/40 border-slate-850 border bg-amber-500/5 shadow-md backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Mic size={20} />
              </div>
              <CardTitle className="text-xl font-bold text-slate-150">Aviso: Captação de sons de ambiente</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-350 text-sm leading-relaxed">
              <p className="font-semibold text-amber-300">
                Atenção ao gravar:
              </p>
              <p className="mt-1">
                Ao utilizar o Gravador da AnimalMind, o microfone do seu dispositivo captará todo o som envolvente. Isto significa que 
                a gravação **pode acidentalmente captar sons do ambiente**, incluindo conversas humanas em segundo plano, ruídos de televisão, 
                ou outros sons domésticos.
              </p>
              <p className="mt-2 text-xs opacity-80">
                Recomendamos que realize as gravações em locais silenciosos e o mais próximo possível do seu animal de estimação para evitar 
                recolhas indesejadas e garantir a maior precisão na classificação acústica.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 z-10 bg-slate-950/80 backdrop-blur-md mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AnimalMind. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-white" onClick={() => setLocation("/")}>Landing Page</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
