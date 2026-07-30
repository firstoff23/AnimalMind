import { Species } from "../value-objects/Species";
import { Confidence } from "../value-objects/Confidence";
import { Breed } from "./Breed";

export interface ClassificationProps {
  id: string;
  userId: string;
  species: string;
  breed?: Breed;
  confidence: number;
  timestamp: Date;
}

export class Classification {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly species: Species,
    public readonly confidence: Confidence,
    public readonly timestamp: Date,
    public readonly breed?: Breed,
  ) {}

  static create(props: ClassificationProps): Classification {
    if (!props.id) throw new Error("ID da classificação é obrigatório.");
    if (!props.userId) throw new Error("ID do utilizador é obrigatório.");

    if (props.timestamp > new Date()) {
      throw new Error("O timestamp da classificação não pode ser no futuro.");
    }

    const speciesVO = Species.create(props.species);
    const confidenceVO = Confidence.create(props.confidence);

    return new Classification(
      props.id,
      props.userId,
      speciesVO,
      confidenceVO,
      props.timestamp,
      props.breed
    );
  }
}
