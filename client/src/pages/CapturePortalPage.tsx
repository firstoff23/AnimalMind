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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/gravar")}
          className="cursor-pointer"
        >
          <Card className="bg-card hover:bg-card/90 border-border overflow-hidden shadow-lg transition-all duration-300 relative group h-44 flex flex-col justify-between p-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-300" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Mic size={22} />
                </div>
                {language === "pt" ? "Gravar Áudio" : "Record Audio"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {language === "pt"
                  ? "Registe vocalizações, miados ou ladridos para analisar a acústica e traduzir o sentimento."
                  : "Record vocalizations, meows, or barks to analyze acoustics and translate the feeling."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex justify-end">
              <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1">
                {language === "pt" ? "Iniciar gravador 🎙️" : "Start recorder 🎙️"}
              </span>
            </CardContent>
          </Card>
        </motion.div>

        {/* Camera Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLocation("/camera")}
          className="cursor-pointer"
        >
          <Card className="bg-card hover:bg-card/90 border-border overflow-hidden shadow-lg transition-all duration-300 relative group h-44 flex flex-col justify-between p-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-300" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                  <Camera size={22} />
                </div>
                {language === "pt" ? "Câmara Visão" : "Vision Camera"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {language === "pt"
                  ? "Ative a câmara e utilize inteligência artificial (YOLOv8) para analisar a postura e linguagem corporal."
                  : "Activate camera and use artificial intelligence (YOLOv8) to analyze posture and body language."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex justify-end">
              <span className="text-[11px] font-bold text-indigo-400 group-hover:underline flex items-center gap-1">
                {language === "pt" ? "Abrir câmara 📷" : "Open camera 📷"}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft size={14} />
          {language === "pt" ? "Voltar ao Dashboard" : "Back to Dashboard"}
        </Button>
      </div>
    </motion.div>
  );
}
