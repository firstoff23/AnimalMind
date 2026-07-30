import { Confidence } from "../value-objects/Confidence";

export interface FeedbackProps {
  id: string;
  userId: string;
  modelName: string;
  prediction: string;
  confidence: number;
  isCorrect: boolean;
  correctLabel?: string;
  imagePath?: string;
  feedbackText?: string;
}

export class Feedback {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly modelName: string,
    public readonly prediction: string,
    public readonly confidence: Confidence,
    public readonly isCorrect: boolean,
    public readonly correctLabel?: string,
    public readonly imagePath?: string,
    public readonly feedbackText?: string,
  ) {}

  static create(props: FeedbackProps): Feedback {
    if (!props.id) throw new Error("ID do feedback é obrigatório.");
    if (!props.userId) throw new Error("ID do utilizador é obrigatório.");
    if (!props.modelName) throw new Error("Nome do modelo é obrigatório.");
    if (!props.prediction) throw new Error("Previsão do modelo é obrigatória.");

    // Valida e cria o Value Object
    const confidenceVO = Confidence.create(props.confidence);

    if (!props.isCorrect && !props.correctLabel) {
      throw new Error("Se a previsão estiver incorreta, o rótulo correto deve ser fornecido.");
    }

    return new Feedback(
      props.id,
      props.userId,
      props.modelName,
      props.prediction,
      confidenceVO,
      props.isCorrect,
      props.correctLabel,
      props.imagePath,
      props.feedbackText
    );
  }
}
