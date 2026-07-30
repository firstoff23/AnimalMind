import { describe, it, expect } from "vitest";
import { AudioRecording } from "./AudioRecording";
import { InvalidAudioClassError } from "../errors/InvalidAudioClassError";

describe("AudioRecording Entity", () => {
  it("should create a valid audio recording", () => {
    const recording = AudioRecording.create({
      id: "a-1",
      userId: "u-1",
      duration: 3.5,
      audioClass: "bark",
      confidence: 0.95,
      timestamp: new Date(Date.now() - 5000)
    });

    expect(recording.id).toBe("a-1");
    expect(recording.duration).toBe(3.5);
    expect(recording.audioClass.value).toBe("bark");
    expect(recording.confidence.value).toBe(0.95);
  });

  it("should throw error if duration is 0 or less", () => {
    expect(() => AudioRecording.create({
      id: "a-1",
      userId: "u-1",
      duration: 0,
      audioClass: "bark",
      confidence: 0.9,
      timestamp: new Date()
    })).toThrowError("A duração da gravação de áudio deve ser maior que zero.");

    expect(() => AudioRecording.create({
      id: "a-1",
      userId: "u-1",
      duration: -1,
      audioClass: "bark",
      confidence: 0.9,
      timestamp: new Date()
    })).toThrowError("A duração da gravação de áudio deve ser maior que zero.");
  });

  it("should throw error for future timestamp", () => {
    const futureDate = new Date(Date.now() + 100000);
    expect(() => AudioRecording.create({
      id: "a-1",
      userId: "u-1",
      duration: 2,
      audioClass: "bark",
      confidence: 0.9,
      timestamp: futureDate
    })).toThrowError("O timestamp da gravação não pode ser no futuro.");
  });

  it("should throw error for invalid audio class", () => {
    expect(() => AudioRecording.create({
      id: "a-1",
      userId: "u-1",
      duration: 2,
      audioClass: "music",
      confidence: 0.9,
      timestamp: new Date()
    })).toThrow(InvalidAudioClassError);
  });
});
