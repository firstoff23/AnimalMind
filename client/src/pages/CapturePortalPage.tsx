import { useLocation } from "wouter";
import { Mic, Camera, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function CapturePortalPage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 22 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="page-enter min-h-full px-4 pt-6 pb-6 space-y-6 max-w-lg mx-auto flex flex-col justify-center"
    >
      <div className="flex flex-col gap-1 text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {language === "pt" ? "Capturar Expressão" : "Capture Expression"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {language === "pt"
            ? "Escolha o modo de captura para analisar o estado emocional do seu animal"
            : "Choose capture mode to analyze your pet's emotional state"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Audio Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => setLocation("/gravar")}
          className="cursor-pointer"
        >
          <Card className="bg-card hover:bg-card/90 border-primary/20 overflow-hidden shadow-lg transition-all duration-300 relative group h-52 flex flex-col justify-between p-4 rounded-2xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-300" />
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Mic size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {language === "pt" ? "Gravar Áudio" : "Record Audio"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {language === "pt"
                    ? "Grave vocalizações do animal para tradução acústica imediata."
                    : "Record vocalizations for immediate acoustic analysis."}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" className="h-8 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                {language === "pt" ? "Gravar agora" : "Record now"}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Camera Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => setLocation("/camera")}
          className="cursor-pointer"
        >
          <Card className="bg-card hover:bg-card/90 border-border overflow-hidden shadow-md transition-all duration-300 relative group h-32 flex items-center justify-between p-4 rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300" />
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                <Camera size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground truncate">
                  {language === "pt" ? "Câmara Visão" : "Vision Camera"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate">
                  {language === "pt"
                    ? "Analise a postura e linguagem corporal em tempo real."
                    : "Analyze posture and body language in real time."}
                </p>
              </div>
            </div>
            <div className="shrink-0 pl-2">
              <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors whitespace-nowrap">
                {language === "pt" ? "Analisar" : "Analyze"} &rarr;
              </span>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
