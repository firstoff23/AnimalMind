import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md rounded-2xl shadow-2xl backdrop-blur-md">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <DialogTitle className="text-lg font-bold text-white flex items-center justify-between">
            <span>Feedback de Classificação</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Ajude-nos a calibrar os modelos de visão e fónica do AnimalMind.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <p className="text-xs text-slate-400">Previsão Atual do Modelo:</p>
            <Badge variant="outline" className="text-sm font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 mt-1">
              {predictedBreed}
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              A previsão de raça estava correta?
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={isCorrect ? "default" : "outline"}
                onClick={() => setIsCorrect(true)}
                className={`flex-1 min-h-[44px] text-xs font-semibold ${
                  isCorrect
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                ✅ Sim, correta
              </Button>
              <Button
                type="button"
                variant={!isCorrect ? "destructive" : "outline"}
                onClick={() => setIsCorrect(false)}
                className={`flex-1 min-h-[44px] text-xs font-semibold ${
                  !isCorrect
                    ? "bg-rose-600 hover:bg-rose-500 text-white border-none"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                ❌ Não, incorreta
              </Button>
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
                placeholder="Ex: Golden Retriever / Bengal"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[44px]"
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
              placeholder="Ex: Pelagem de cor diferente ou tamanho médio..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Anexar foto para retreino do modelo (opcional):
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
              }`}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="flex items-center justify-center gap-3">
                  <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                  <span className="text-xs text-emerald-400 font-medium">Imagem selecionada (clique ou arraste para substituir)</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {isDragActive ? "Solte a imagem aqui..." : "📁 Arraste uma imagem ou clique para selecionar"}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px]"
            >
              {isSubmitting ? "A guardar..." : "Submeter Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

