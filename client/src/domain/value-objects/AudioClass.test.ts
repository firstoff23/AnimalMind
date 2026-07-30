import { describe, it, expect } from "vitest";
import { AudioClass } from "./AudioClass";
import { InvalidAudioClassError } from "../errors/InvalidAudioClassError";

describe("AudioClass Value Object", () => {
  it("should create valid audio classes", () => {
    expect(AudioClass.create("bark").value).toBe("bark");
    expect(AudioClass.create("meow").value).toBe("meow");
    expect(AudioClass.create("whine").value).toBe("whine");
    expect(AudioClass.create("growl").value).toBe("growl");
    expect(AudioClass.create("hiss").value).toBe("hiss");
    expect(AudioClass.create("silence").value).toBe("silence");
  });

  it("should normalize audio class input", () => {
    expect(AudioClass.create(" BARK ").value).toBe("bark");
    expect(AudioClass.create("Meow").value).toBe("meow");
  });

  it("should throw error for invalid audio class", () => {
    expect(() => AudioClass.create("purr")).toThrow(InvalidAudioClassError);
    expect(() => AudioClass.create("")).toThrow(InvalidAudioClassError);
  });

  it("should evaluate equality correctly", () => {
    const a1 = AudioClass.create("bark");
    const a2 = AudioClass.create("BARK");
    const a3 = AudioClass.create("meow");
    expect(a1.equals(a2)).toBe(true);
    expect(a1.equals(a3)).toBe(false);
  });
});
