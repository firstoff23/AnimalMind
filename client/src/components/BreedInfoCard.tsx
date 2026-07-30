import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

export interface BreedInfoData {
  species: string;
  group?: string;
  temperament?: string[];
  description?: string;
  exercise_needs?: string;
  health_risks?: string[];
  life_expectancy?: string;
  average_weight?: string;
  origin?: string;
  grooming_needs?: string;
  trainability?: string;
  good_with_children?: boolean;
  good_with_pets?: boolean;
}

export interface Top3BreedItem {
  breed: string;
  confidence: number;
}

export interface BreedInfoCardProps {
  breed: string;
  confidence: number;
  species: string;
  top3?: Top3BreedItem[];
  info?: BreedInfoData;
  onFeedbackClick?: () => void;
}

export const BreedInfoCard: React.FC<BreedInfoCardProps> = ({
  breed,
  confidence,
  species,
  top3 = [],
  info,
  onFeedbackClick,
}) => {
  return (
    <Card className="bg-slate-900/90 border-slate-800 shadow-2xl text-slate-100 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 mb-1">
            {species === "cat" ? "🐱 Gato" : "🐶 Cão"} • Classificação v1
          </Badge>
          <CardTitle className="text-xl font-bold text-white">{breed}</CardTitle>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-emerald-400">
            {(confidence * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-400">Confiança Calibrada</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Top 3 Predictions Bar */}
        {top3 && top3.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-slate-400">Top 3 Probabilidades Calibradas:</p>
            {top3.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-200">{item.breed}</span>
                  <span className="text-slate-400 font-mono">{(item.confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress value={Math.max(item.confidence * 100, 2)} className="h-1.5 bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {/* Detailed Breed Info Panel */}
        {info && (
          <div className="pt-2 space-y-3 border-t border-slate-800">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {info.origin && (
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 font-normal">
                  🌐 Origem: <strong className="ml-1 text-white">{info.origin}</strong>
                </Badge>
              )}
              {info.life_expectancy && (
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 font-normal">
                  ⏳ Vida: <strong className="ml-1 text-white">{info.life_expectancy}</strong>
                </Badge>
              )}
              {info.average_weight && (
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 font-normal">
                  ⚖️ Peso: <strong className="ml-1 text-white">{info.average_weight}</strong>
                </Badge>
              )}
              {info.trainability && (
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 font-normal">
                  🎓 Treino: <strong className="ml-1 text-white">{info.trainability}</strong>
                </Badge>
              )}
            </div>

            {info.description && (
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{info.description}"
              </p>
            )}

            {info.temperament && info.temperament.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Temperamento:</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.temperament.map((trait, tIdx) => (
                    <Badge
                      key={tIdx}
                      variant="outline"
                      className="bg-indigo-950/60 text-indigo-300 text-[11px] border-indigo-800/40"
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {info.health_risks && info.health_risks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1">Cuidados de Saúde:</p>
                <ul className="text-xs text-amber-300/90 list-disc list-inside space-y-0.5">
                  {info.health_risks.map((risk, rIdx) => (
                    <li key={rIdx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Footer */}
        {onFeedbackClick && (
          <div className="pt-2 flex justify-end border-t border-slate-800/60">
            <button
              onClick={onFeedbackClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1 transition-colors min-h-[44px]"
            >
              💬 Reportar correção ou feedback
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

