import { describe, it, expect } from "vitest";
import { Confidence } from "./Confidence";
import { InvalidConfidenceError } from "../errors/InvalidConfidenceError";

describe("Confidence Value Object", () => {
  it("should create a valid confidence", () => {
    const confidence = Confidence.create(0.85);
    expect(confidence.value).toBe(0.85);
  });

  it("should allow edge values 0 and 1", () => {
    expect(Confidence.create(0).value).toBe(0);
    expect(Confidence.create(1).value).toBe(1);
  });

  it("should throw error for values less than 0", () => {
    expect(() => Confidence.create(-0.1)).toThrow(InvalidConfidenceError);
  });

  it("should throw error for values greater than 1", () => {
    expect(() => Confidence.create(1.01)).toThrow(InvalidConfidenceError);
  });

  it("should throw error for NaN", () => {
    expect(() => Confidence.create(NaN)).toThrow(InvalidConfidenceError);
  });

  it("should evaluate equality correctly", () => {
    const c1 = Confidence.create(0.5);
    const c2 = Confidence.create(0.5);
    const c3 = Confidence.create(0.6);
    expect(c1.equals(c2)).toBe(true);
    expect(c1.equals(c3)).toBe(false);
  });
});
