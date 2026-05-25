import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("FastAPI YAMNet backend contract", () => {
  const appSource = readFileSync("ml_backend/app.py", "utf8");
  const requirements = readFileSync("ml_backend/requirements.txt", "utf8");

  it("loads the official YAMNet model from TensorFlow Hub", () => {
    expect(appSource).toContain("https://tfhub.dev/google/yamnet/1");
    expect(appSource).toContain("tensorflow_hub");
    expect(appSource).toContain("classify_with_yamnet");
  });

  it("keeps a scipy signal fallback for environments without the model", () => {
    expect(appSource).toContain("classify_with_signal_features");
    expect(appSource).toContain("scipy-heuristics-fallback");
  });

  it("declares TensorFlow Hub runtime dependencies", () => {
    expect(requirements).toMatch(/^tensorflow[<>=]/m);
    expect(requirements).toMatch(/^tensorflow-hub[<>=]/m);
  });
});
