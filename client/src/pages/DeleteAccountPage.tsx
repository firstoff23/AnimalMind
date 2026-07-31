import { ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-500">
            <ShieldAlert size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Eliminação de Conta e Dados</h1>
        
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          A sua privacidade é importante para nós. Se desejar eliminar a sua conta e todos os dados associados (fotografias, gravações áudio, histórico e perfis dos seus animais), por favor envie-nos um pedido por email.
        </p>

        <div className="space-y-4">
          <Button className="w-full h-11" asChild>
            <a href="mailto:suporte@pawra.app?subject=Pedido de Eliminação de Conta&body=Olá,%0A%0AOs meus dados são:%0AEmail associado à conta: [SEU EMAIL AQUI]%0A%0AConfirmo que desejo apagar permanentemente a minha conta PeloNaRoupa e todos os dados associados.%0A%0AObrigado.">
              <Mail className="mr-2 h-5 w-5" />
              Solicitar Eliminação por Email
            </a>
          </Button>

          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            Processaremos o seu pedido num prazo máximo de 72 horas úteis de acordo com o RGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
