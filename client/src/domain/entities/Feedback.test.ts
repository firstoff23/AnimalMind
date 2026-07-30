import { describe, it, expect } from "vitest";
import { Feedback } from "./Feedback";
import { InvalidConfidenceError } from "../errors/InvalidConfidenceError";

describe("Feedback Entity", () => {
  it("should create a valid correct feedback", () => {
    const feedback = Feedback.create({
      id: "f-1",
      userId: "u-1",
      modelName: "MobileNetV3",
      prediction: "Golden Retriever",
      confidence: 0.95,
      isCorrect: true
    });

    expect(feedback.id).toBe("f-1");
    expect(feedback.confidence.value).toBe(0.95);
    expect(feedback.isCorrect).toBe(true);
  });

  it("should create a valid incorrect feedback with correct label", () => {
    const feedback = Feedback.create({
      id: "f-2",
      userId: "u-1",
      modelName: "MobileNetV3",
      prediction: "Golden Retriever",
      confidence: 0.75,
      isCorrect: false,
      correctLabel: "Labrador Retriever"
    });

    expect(feedback.isCorrect).toBe(false);
    expect(feedback.correctLabel).toBe("Labrador Retriever");
  });

  it("should throw error if incorrect feedback lacks correct label", () => {
    expect(() => Feedback.create({
      id: "f-2",
      userId: "u-1",
      modelName: "MobileNetV3",
      prediction: "Golden Retriever",
      confidence: 0.75,
      isCorrect: false
    })).toThrowError("Se a previsão estiver incorreta, o rótulo correto deve ser fornecido.");
  });

  it("should throw domain error for invalid confidence", () => {
    expect(() => Feedback.create({
      id: "f-3",
      userId: "u-1",
      modelName: "MobileNetV3",
      prediction: "Cat",
      confidence: 1.5,
      isCorrect: true
    })).toThrow(InvalidConfidenceError);
  });
});
