import { DomainError } from "./DomainError";

export class InvalidAudioClassError extends DomainError {
  constructor(value: string) {
    super(`Classe de áudio inválida: ${value}. Permitidas: bark, meow, whine, growl, hiss, silence.`);
  }
}
