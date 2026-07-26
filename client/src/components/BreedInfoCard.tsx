import React from "react";

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 space-y-4">
      {/* Header & Main Prediction */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
            {species === "cat" ? "🐱 Gato" : "🐶 Cão"} • Classificação v1
          </span>
          <h3 className="text-xl font-bold text-white">{breed}</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-emerald-400">
            {(confidence * 100).toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-400">Confiança Calibrada</p>
        </div>
      </div>

      {/* Top 3 Predictions Bar */}
      {top3 && top3.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">Top 3 Probabilidades Calibradas:</p>
          {top3.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-200">{item.breed}</span>
                <span className="text-slate-400">{(item.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.confidence * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Breed Info Panel */}
      {info && (
        <div className="pt-2 space-y-3 border-t border-slate-800">
          <div className="flex flex-wrap gap-2 text-xs">
            {info.origin && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                🌐 Origem: <strong>{info.origin}</strong>
              </span>
            )}
            {info.life_expectancy && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                ⏳ Vida: <strong>{info.life_expectancy}</strong>
              </span>
            )}
            {info.average_weight && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                ⚖️ Peso: <strong>{info.average_weight}</strong>
              </span>
            )}
            {info.trainability && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                🎓 Treino: <strong>{info.trainability}</strong>
              </span>
            )}
            {info.grooming_needs && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                ✂️ Pelagem: <strong>{info.grooming_needs}</strong>
              </span>
            )}
            {info.good_with_children !== undefined && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                👶 Crianças: <strong>{info.good_with_children ? "Sim" : "Não"}</strong>
              </span>
            )}
            {info.good_with_pets !== undefined && (
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                🐾 Outros Pets: <strong>{info.good_with_pets ? "Sim" : "Não"}</strong>
              </span>
            )}
          </div>

          {info.description && (
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{info.description}"
            </p>
          )}

          {info.temperament && info.temperament.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1">Temperamento:</p>
              <div className="flex flex-wrap gap-1.5">
                {info.temperament.map((trait, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 bg-indigo-950/60 text-indigo-300 text-[11px] rounded-md border border-indigo-800/40"
                  >
                    {trait}
                  </span>
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
        <div className="pt-2 flex justify-end">
          <button
            onClick={onFeedbackClick}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline flex items-center gap-1 transition-colors"
          >
            💬 Reportar correção ou feedback
          </button>
        </div>
      )}
    </div>
  );
};
