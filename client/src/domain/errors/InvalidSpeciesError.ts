import { DomainError } from "./DomainError";

export class InvalidSpeciesError extends DomainError {
  constructor(value: string) {
    super(`Espécie inválida: ${value}. Permitidas: dog, cat, unknown.`);
  }
}
