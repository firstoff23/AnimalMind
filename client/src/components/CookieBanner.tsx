import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleConsent = (type: "accepted" | "essential") => {
    localStorage.setItem("cookie_consent", type);
    setShowBanner(false);
  };

  const text = {
    pt: {
      title: "Consentimento de Cookies",
      description:
        "Utilizamos cookies e local storage para melhorar a tua experiência de acompanhamento e permitir o funcionamento offline.",
      essential: "Só essenciais",
      accept: "Aceitar",
    },
    en: {
      title: "Cookie Consent",
      description:
        "We use cookies and local storage to enhance your tracking experience and support offline capabilities.",
      essential: "Essential only",
      accept: "Accept",
    },
  };

  const t = language === "pt" ? text.pt : text.en;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[100] overflow-hidden"
        >
          <div className="relative bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4">
            {/* Ambient background light */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none -z-10" />

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Cookie className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  {t.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConsent("essential")}
                className="flex-1 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-900 h-9 rounded-xl"
              >
                {t.essential}
              </Button>
              <Button
                size="sm"
                onClick={() => handleConsent("accepted")}
                className="flex-1 text-[11px] font-bold bg-gradient-to-r from-primary via-emerald-400 to-emerald-300 text-slate-950 hover:brightness-105 transition-all shadow-md active:scale-[0.98] h-9 rounded-xl border-0"
              >
                {t.accept}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
