import { describe, it, expect } from "vitest";
import { Breed } from "./Breed";

describe("Breed Entity", () => {
  it("should create a valid breed", () => {
    const breed = Breed.create({
      id: "breed-1",
      name: "Golden Retriever",
      group: "Sporting",
      origin: "Scotland"
    });

    expect(breed.id).toBe("breed-1");
    expect(breed.name).toBe("Golden Retriever");
    expect(breed.group).toBe("Sporting");
    expect(breed.origin).toBe("Scotland");
  });

  it("should throw error if ID is missing", () => {
    expect(() => Breed.create({
      id: "",
      name: "Golden Retriever",
      group: "Sporting"
    })).toThrowError("ID da raça é obrigatório.");
  });

  it("should throw error if name is missing", () => {
    expect(() => Breed.create({
      id: "breed-1",
      name: "   ",
      group: "Sporting"
    })).toThrowError("Nome da raça é obrigatório.");
  });

  it("should throw error if group is missing", () => {
    expect(() => Breed.create({
      id: "breed-1",
      name: "Golden Retriever",
      group: ""
    })).toThrowError("Grupo da raça é obrigatório.");
  });
});
