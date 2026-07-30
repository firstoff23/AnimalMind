import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { Button } from "@/components/ui/button";

export default function RefundPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans py-16">
      <BackgroundGrid className="opacity-30" />
      <div className="max-w-3xl mx-auto px-5 relative z-10 w-full">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-8 pl-0 hover:bg-transparent hover:text-white text-slate-400 group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Voltar à página principal
        </Button>

        <h1 className="text-4xl font-extrabold mb-8 tracking-tight text-white">Política de Reembolso</h1>
        
        <div className="prose prose-invert prose-slate max-w-none text-slate-300">
          <p className="mb-6">
            A Pawra esforça-se por proporcionar o melhor serviço possível para compreender e monitorizar o seu animal de estimação. A nossa política de reembolso foi concebida para ser justa e transparente.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">1. Direito de Retratação</h2>
          <p className="mb-6">
            Tem o direito de cancelar a sua subscrição a qualquer momento. Se efetuou um pagamento e deseja ser reembolsado, oferecemos uma garantia de devolução do dinheiro num prazo de 14 dias após a subscrição inicial, sem necessidade de justificação.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">2. Elegibilidade para Reembolso</h2>
          <p className="mb-4">Para ser elegível para um reembolso, tem de cumprir os seguintes critérios:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>O pedido deve ser feito dentro do período de 14 dias após a compra.</li>
            <li>Aplica-se apenas à primeira faturação da subscrição (não aplicável a renovações automáticas, a menos que especificado por lei).</li>
            <li>Em casos de falhas técnicas contínuas que o impeçam de utilizar a aplicação devidamente.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">3. Exceções</h2>
          <p className="mb-6">
            Não são concedidos reembolsos nas seguintes situações:
            <br />- Após o período de 14 dias da compra inicial.
            <br />- Contas banidas por violação dos nossos Termos de Uso (ex: abuso da API, comportamentos nocivos).
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-white">4. Como Solicitar</h2>
          <p className="mb-6">
            Para solicitar um reembolso, contacte o nosso suporte através de <strong>suporte@pawra.app</strong> indicando o endereço de email associado à sua conta e o motivo do cancelamento (opcional). O processamento poderá demorar entre 5 a 10 dias úteis, dependendo do seu método de pagamento.
          </p>

          <p className="mt-12 text-sm text-slate-500">
            Última atualização: {new Date().toLocaleDateString('pt-PT')}
          </p>
        </div>
      </div>
    </div>
  );
}
