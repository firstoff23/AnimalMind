import { describe, it, expect } from "vitest";
import { Species } from "./Species";
import { InvalidSpeciesError } from "../errors/InvalidSpeciesError";

describe("Species Value Object", () => {
  it("should create valid species", () => {
    expect(Species.create("dog").value).toBe("dog");
    expect(Species.create("cat").value).toBe("cat");
    expect(Species.create("unknown").value).toBe("unknown");
  });

  it("should normalize species input", () => {
    expect(Species.create(" DOG ").value).toBe("dog");
    expect(Species.create("Cat").value).toBe("cat");
  });

  it("should throw error for invalid species", () => {
    expect(() => Species.create("bird")).toThrow(InvalidSpeciesError);
    expect(() => Species.create("")).toThrow(InvalidSpeciesError);
  });

  it("should evaluate equality correctly", () => {
    const s1 = Species.create("dog");
    const s2 = Species.create("DOG");
    const s3 = Species.create("cat");
    expect(s1.equals(s2)).toBe(true);
    expect(s1.equals(s3)).toBe(false);
  });
});
