import { describe, it, expect } from "vitest";
import { Classification } from "./Classification";
import { Breed } from "./Breed";
import { InvalidSpeciesError } from "../errors/InvalidSpeciesError";

describe("Classification Entity", () => {
  it("should create a valid classification", () => {
    const classification = Classification.create({
      id: "c-1",
      userId: "u-1",
      species: "dog",
      confidence: 0.88,
      timestamp: new Date(Date.now() - 1000)
    });

    expect(classification.id).toBe("c-1");
    expect(classification.species.value).toBe("dog");
    expect(classification.confidence.value).toBe(0.88);
  });

  it("should create classification with breed", () => {
    const breed = Breed.create({
      id: "b-1",
      name: "Beagle",
      group: "Hound"
    });

    const classification = Classification.create({
      id: "c-2",
      userId: "u-1",
      species: "dog",
      breed,
      confidence: 0.92,
      timestamp: new Date()
    });

    expect(classification.breed?.name).toBe("Beagle");
  });

  it("should throw error for future timestamp", () => {
    const futureDate = new Date(Date.now() + 100000);
    expect(() => Classification.create({
      id: "c-1",
      userId: "u-1",
      species: "dog",
      confidence: 0.9,
      timestamp: futureDate
    })).toThrowError("O timestamp da classificação não pode ser no futuro.");
  });

  it("should throw error for invalid species", () => {
    expect(() => Classification.create({
      id: "c-1",
      userId: "u-1",
      species: "bird",
      confidence: 0.9,
      timestamp: new Date()
    })).toThrow(InvalidSpeciesError);
  });
});
