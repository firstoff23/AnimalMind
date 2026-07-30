import { DomainError } from "./DomainError";

export class InvalidEmailError extends DomainError {
  constructor(value: string) {
    super(`Formato de email inválido: ${value}.`);
  }
}
