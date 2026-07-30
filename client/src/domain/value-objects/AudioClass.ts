import { InvalidAudioClassError } from "../errors/InvalidAudioClassError";

export type ValidAudioClass = "bark" | "meow" | "whine" | "growl" | "hiss" | "silence";

export class AudioClass {
  private static readonly VALID_CLASSES = new Set<ValidAudioClass>([
    "bark", "meow", "whine", "growl", "hiss", "silence"
  ]);

  private constructor(private readonly _value: ValidAudioClass) {}

  get value(): ValidAudioClass {
    return this._value;
  }

  static create(value: string): AudioClass {
    const normalizedValue = value.toLowerCase().trim() as ValidAudioClass;
    
    if (!AudioClass.VALID_CLASSES.has(normalizedValue)) {
      throw new InvalidAudioClassError(value);
    }
    
    return new AudioClass(normalizedValue);
  }

  equals(other: AudioClass): boolean {
    return this._value === other.value;
  }
}
