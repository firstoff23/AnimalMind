import { InvalidConfidenceError } from "../errors/InvalidConfidenceError";

export class Confidence {
  private constructor(private readonly _value: number) {}

  get value(): number {
    return this._value;
  }

  static create(value: number): Confidence {
    if (typeof value !== "number" || isNaN(value) || value < 0 || value > 1) {
      throw new InvalidConfidenceError(value);
    }
    return new Confidence(value);
  }

  equals(other: Confidence): boolean {
    return this._value === other.value;
  }
}
