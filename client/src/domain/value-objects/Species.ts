import { InvalidSpeciesError } from "../errors/InvalidSpeciesError";

export type ValidSpecies = "dog" | "cat" | "unknown";

export class Species {
  private static readonly VALID_SPECIES = new Set<ValidSpecies>(["dog", "cat", "unknown"]);

  private constructor(private readonly _value: ValidSpecies) {}

  get value(): ValidSpecies {
    return this._value;
  }

  static create(value: string): Species {
    const normalizedValue = value.toLowerCase().trim() as ValidSpecies;
    
    if (!Species.VALID_SPECIES.has(normalizedValue)) {
      throw new InvalidSpeciesError(value);
    }
    
    return new Species(normalizedValue);
  }

  equals(other: Species): boolean {
    return this._value === other.value;
  }
}
