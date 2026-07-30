import { DomainError } from "./DomainError";

export class InvalidConfidenceError extends DomainError {
  constructor(value: number) {
    super(`Confiança inválida: ${value}. Deve ser um número entre 0 e 1.`);
  }
}
