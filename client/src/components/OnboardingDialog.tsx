import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, PawPrint, Sparkles } from "lucide-react";

const ONBOARDING_SEEN_KEY = "animalmind-onboarding-seen";

const steps = [
  {
    icon: PawPrint,
    title: "Adiciona o teu animal",
    description: "Cria o perfil para associar cada som ao animal certo.",
  },
  {
    icon: Mic,
    title: "Grava um som",
    description: "Usa o botão central para captar uma vocalização curta.",
  },
  {
    icon: Sparkles,
    title: "Vê o resultado",
    description: "Confere o estado emocional, confiança e histórico.",
  },
];

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      setOpen(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) completeOnboarding();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-md border-border bg-card text-card-foreground">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl">Primeiros passos</DialogTitle>
          <DialogDescription>
            Três ações rápidas para começar a usar o AnimalMind.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={completeOnboarding} className="w-full">
          Começar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
