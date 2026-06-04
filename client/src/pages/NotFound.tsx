import { Button } from "@/components/ui/button";
import { PawPrint, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4">
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl scale-150" aria-hidden="true" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-slate-900 border border-slate-800">
            <PawPrint className="h-10 w-10 text-emerald-400" aria-hidden="true" />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-slate-800 select-none">404</h1>
          <h2 className="text-lg font-bold text-foreground">Página não encontrada</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A página que está a procurar não existe ou foi movida.
            <br />
            Verifique o endereço ou volte ao início.
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={() => setLocation("/")}
          className="bg-primary hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 active-scale tap-highlight-none"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Ir para o início
        </Button>
      </div>
    </div>
  );
}
