import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface TrendCardProps {
  animalId: number;
}

export function TrendCard({ animalId }: TrendCardProps) {
  const { t, language } = useLanguage();

  const { data: trend, isLoading: isLoadingTrend, error: trendError } =
    trpc.trends.getWeeklyTrend.useQuery({ animalId });
  const { data: patterns, isLoading: isLoadingPatterns } =
    trpc.trends.getPatterns.useQuery({ animalId });

  if (isLoadingTrend || isLoadingPatterns) {
    return (
      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40 bg-slate-800" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-48 bg-slate-800" />
          <Skeleton className="h-40 w-full bg-slate-800 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 bg-slate-800 rounded-full" />
            <Skeleton className="h-6 w-32 bg-slate-800 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendError || !trend) {
    return (
      <Card className="bg-red-500/5 border border-red-500/10 p-4 flex gap-3 items-center">
        <AlertCircle className="text-red-500" size={20} />
        <span className="text-xs text-muted-foreground">
          {language === "pt" ? "Erro ao carregar tendências." : "Error loading trends."}
        </span>
      </Card>
    );
  }

  const { trend: direction, percentageChange, dailyScores, message } = trend;
  const patternList = patterns?.patterns || [];

  return (
    <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {language === "pt" ? "Tendência de Bem-estar" : "Well-being Trend"}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-4">
        {/* Badge & Value */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            {direction === "up" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp size={12} />
                {percentageChange > 0 ? `+${percentageChange}%` : `${percentageChange}%`}{" "}
                {language === "pt" ? "esta semana" : "this week"}
              </span>
            )}
            {direction === "down" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <TrendingDown size={12} />
                {percentageChange}% {language === "pt" ? "esta semana" : "this week"}
              </span>
            )}
            {direction === "stable" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                <Minus size={12} />
                {language === "pt" ? "Estável" : "Stable"}
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground leading-relaxed">{message}</p>

        {/* Line Chart */}
        {dailyScores.length > 0 && (
          <div className="h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyScores} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] shadow-xl">
                        <p className="font-semibold text-indigo-400">Score: {payload[0].value}%</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#818cf8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pattern Chips */}
        {patternList.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {language === "pt" ? "Padrões Identificados:" : "Identified Patterns:"}
            </p>
            <div className="flex flex-col gap-1.5">
              {patternList.map((p, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-indigo-950/20 text-indigo-300 border border-indigo-500/10 px-3 py-1.5 rounded-xl leading-normal flex items-start gap-1.5"
                >
                  <span className="mt-0.5 text-indigo-400">✨</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
