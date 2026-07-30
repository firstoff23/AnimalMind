import { AudioClass } from "../value-objects/AudioClass";
import { Confidence } from "../value-objects/Confidence";

export interface AudioRecordingProps {
  id: string;
  userId: string;
  duration: number; // in seconds
  audioClass: string;
  confidence: number;
  timestamp: Date;
}

export class AudioRecording {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly duration: number,
    public readonly audioClass: AudioClass,
    public readonly confidence: Confidence,
    public readonly timestamp: Date,
  ) {}

  static create(props: AudioRecordingProps): AudioRecording {
    if (!props.id) throw new Error("ID da gravação é obrigatório.");
    if (!props.userId) throw new Error("ID do utilizador é obrigatório.");
    
    if (props.duration <= 0) {
      throw new Error("A duração da gravação de áudio deve ser maior que zero.");
    }
    
    if (props.timestamp > new Date()) {
      throw new Error("O timestamp da gravação não pode ser no futuro.");
    }

    const audioClassVO = AudioClass.create(props.audioClass);
    const confidenceVO = Confidence.create(props.confidence);

    return new AudioRecording(
      props.id,
      props.userId,
      props.duration,
      audioClassVO,
      confidenceVO,
      props.timestamp
    );
  }
}
