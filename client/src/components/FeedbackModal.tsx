import React, { useState } from "react";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    is_correct: boolean;
    correct_label?: string;
    feedback_text?: string;
    image_base64?: string;
  }) => Promise<void>;
  predictedBreed: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  predictedBreed,
}) => {
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [correctLabel, setCorrectLabel] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        const base64Data = result.split(",")[1] || result;
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        is_correct: isCorrect,
        correct_label: isCorrect ? undefined : correctLabel,
        feedback_text: feedbackText,
        image_base64: imageBase64 || undefined,
      });
      onClose();
    } catch (err) {
      console.error("[FeedbackModal] Error submitting feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white">Feedback de Classificação</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-xs text-slate-400">Previsão Atual do Modelo:</p>
            <p className="text-sm font-semibold text-indigo-400">{predictedBreed}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              A previsão de raça estava correta?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsCorrect(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isCorrect
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                ✅ Sim, correta
              </button>
              <button
                type="button"
                onClick={() => setIsCorrect(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  !isCorrect
                    ? "bg-rose-600 border-rose-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                ❌ Não, incorreta
              </button>
            </div>
          </div>

          {!isCorrect && (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Qual é a raça correta?
              </label>
              <input
                type="text"
                value={correctLabel}
                onChange={(e) => setCorrectLabel(e.target.value)}
                placeholder="Ex: Golden Retriever"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Observações contextuais (opcional):
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: O cão tem pelagem mais escura e de tamanho médio..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Anexar foto para retreino do modelo (opcional):
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
            {previewUrl && (
              <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "A guardar..." : "Submeter Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
