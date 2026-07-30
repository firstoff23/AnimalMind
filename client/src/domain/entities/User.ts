import { InvalidEmailError } from "../errors/InvalidEmailError";

export interface UserProps {
  id: string;
  email: string;
  roles: string[];
  mfaEnabled: boolean;
}

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly roles: string[],
    public readonly mfaEnabled: boolean,
  ) {}

  static create(props: UserProps): User {
    if (!props.id) {
      throw new Error("ID do utilizador é obrigatório.");
    }
    
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      throw new InvalidEmailError(props.email);
    }

    return new User(
      props.id,
      props.email.toLowerCase(),
      props.roles || [],
      props.mfaEnabled || false
    );
  }
}
