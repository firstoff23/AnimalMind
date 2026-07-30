export interface BreedProps {
  id: string;
  name: string;
  group: string;
  temperament?: string;
  origin?: string;
  lifeExpectancy?: string;
  averageWeight?: string;
}

export class Breed {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly group: string,
    public readonly temperament?: string,
    public readonly origin?: string,
    public readonly lifeExpectancy?: string,
    public readonly averageWeight?: string,
  ) {}

  static create(props: BreedProps): Breed {
    if (!props.id || props.id.trim() === "") {
      throw new Error("ID da raça é obrigatório.");
    }
    if (!props.name || props.name.trim() === "") {
      throw new Error("Nome da raça é obrigatório.");
    }
    if (!props.group || props.group.trim() === "") {
      throw new Error("Grupo da raça é obrigatório.");
    }

    return new Breed(
      props.id,
      props.name.trim(),
      props.group.trim(),
      props.temperament,
      props.origin,
      props.lifeExpectancy,
      props.averageWeight
    );
  }
}
