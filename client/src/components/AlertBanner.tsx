import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import { AlertCircle, AlertTriangle, Info, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  animalId: number;
}

type AlertType = "red" | "orange" | "yellow" | "blue" | null;

export function AlertBanner({ animalId }: AlertBannerProps) {
  const { language } = useLanguage();

  const { data: trend } = trpc.trends.getWeeklyTrend.useQuery({ animalId });
  const { data: listData } = trpc.events.listForAnimal.useQuery({ animalId, page: 1, pageSize: 20 });
  const { data: vaccines } = trpc.health.getVaccines.useQuery({ animalId });

  const [activeAlert, setActiveAlert] = useState<{
    type: AlertType;
    message: string;
    description: string;
  } | null>(null);

  const [dismissedType, setDismissedType] = useState<string | null>(null);

  // Check alert conditions and priorities
  useEffect(() => {
    if (!trend) return;

    // 1. Red Alert: Decline > 30% week-over-week
    if (trend.trend === "down" && trend.percentageChange <= -30) {
      setActiveAlert({
        type: "red",
        message: language === "pt" ? "Alerta Crítico de Bem-estar" : "Critical Well-being Alert",
        description: language === "pt"
          ? `O índice de bem-estar diminuiu ${Math.abs(trend.percentageChange)}% em relação à semana passada.`
          : `Well-being index dropped by ${Math.abs(trend.percentageChange)}% compared to last week.`,
      });
      return;
    }

    // 2. Orange Alert: 3+ consecutive days with score < 30
    // Check daily scores from trend
    let consecutiveLowDays = 0;
    let hasOrangeAlert = false;
    
    // trend.dailyScores has DD/MM format. Let's look at the scores
    if (trend.dailyScores && trend.dailyScores.length >= 3) {
      for (const ds of trend.dailyScores) {
        if (ds.score < 30) {
          consecutiveLowDays++;
          if (consecutiveLowDays >= 3) {
            hasOrangeAlert = true;
            break;
          }
        } else {
          consecutiveLowDays = 0;
        }
      }
    }

    if (hasOrangeAlert) {
      setActiveAlert({
        type: "orange",
        message: language === "pt" ? "Agitação Prolongada Detetada" : "Prolonged Agitation Detected",
        description: language === "pt"
          ? "O animal apresenta scores de agitação/angústia elevados há 3 ou mais dias consecutivos."
          : "The animal has shown high agitation/distress scores for 3 or more consecutive days.",
      });
      return;
    }

    // 3. Yellow Alert: Vaccine expiring within 14 days
    if (vaccines && vaccines.length > 0) {
      const now = new Date();
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(now.getDate() + 14);

      const expiringVaccine = vaccines.find((v) => {
        if (!v || !v.nextDueDate) return false;
        const dueDate = new Date(v.nextDueDate);
        return dueDate > now && dueDate <= fourteenDaysFromNow;
      });

      if (expiringVaccine) {
        const formattedDate = new Date(expiringVaccine.nextDueDate!).toLocaleDateString(
          language === "pt" ? "pt-PT" : "en-US"
        );
        setActiveAlert({
          type: "yellow",
          message: language === "pt" ? "Vacinação Próxima" : "Upcoming Vaccination",
          description: language === "pt"
            ? `A vacina "${expiringVaccine.vaccineName}" expira em breve (data limite: ${formattedDate}).`
            : `Vaccine "${expiringVaccine.vaccineName}" expires soon (due date: ${formattedDate}).`,
        });
        return;
      }
    }

    // 4. Blue Info: No recordings in 7 days
    const lastEvent = listData?.events?.[0];
    const noRecordings = !lastEvent || (Date.now() - new Date(lastEvent.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
    
    if (noRecordings) {
      setActiveAlert({
        type: "blue",
        message: language === "pt" ? "Gravação Recomendada" : "Recording Recommended",
        description: language === "pt"
          ? "Não realiza gravações de som há mais de 7 dias. Atualize o estado emocional do seu animal."
          : "No sound recordings in over 7 days. Update your animal's emotional status.",
      });
      return;
    }

    // Default: no alert
    setActiveAlert(null);
  }, [trend, listData, vaccines, language]);

  // Check dismissed state from local storage on mount/change
  useEffect(() => {
    if (activeAlert?.type) {
      const dismissKey = `dismiss-alert-${animalId}-${activeAlert.type}`;
      const dismissedAt = localStorage.getItem(dismissKey);
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        if (diff < 24 * 60 * 60 * 1000) {
          setDismissedType(activeAlert.type);
        } else {
          localStorage.removeItem(dismissKey);
          setDismissedType(null);
        }
      } else {
        setDismissedType(null);
      }
    }
  }, [activeAlert, animalId]);

  if (!activeAlert || activeAlert.type === dismissedType) return null;

  const handleDismiss = () => {
    if (activeAlert.type) {
      const dismissKey = `dismiss-alert-${animalId}-${activeAlert.type}`;
      localStorage.setItem(dismissKey, String(Date.now()));
      setDismissedType(activeAlert.type);
    }
  };

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case "red":
        return {
          bg: "bg-red-500/10 border-red-500/20",
          text: "text-red-400",
          icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
        };
      case "orange":
        return {
          bg: "bg-orange-500/10 border-orange-500/20",
          text: "text-orange-400",
          icon: <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />,
        };
      case "yellow":
        return {
          bg: "bg-yellow-500/10 border-yellow-500/20",
          text: "text-yellow-400",
          icon: <Calendar className="w-5 h-5 text-yellow-500 shrink-0" />,
        };
      case "blue":
        return {
          bg: "bg-sky-500/10 border-sky-500/20",
          text: "text-sky-400",
          icon: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
        };
      default:
        return {
          bg: "bg-slate-500/10 border-slate-500/20",
          text: "text-slate-400",
          icon: <Info className="w-5 h-5 text-slate-500 shrink-0" />,
        };
    }
  };

  const styles = getAlertStyles(activeAlert.type);

  return (
    <div className={cn("border rounded-2xl p-4 flex items-start gap-3 relative transition-all page-enter", styles.bg)}>
      {styles.icon}
      <div className="flex-1 min-w-0 pr-6">
        <h4 className={cn("text-xs font-bold uppercase tracking-wide", styles.text)}>
          {activeAlert.message}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {activeAlert.description}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-slate-800/40"
      >
        <X size={14} />
      </button>
    </div>
  );
}
