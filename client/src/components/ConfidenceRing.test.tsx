// biome-ignore lint/correctness/noUnusedImports: React is needed for JSX in Vitest
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../hooks/useLanguage";
import { ConfidenceRing } from "./ConfidenceRing";

describe("ConfidenceRing", () => {
  it("renders the confidence percentage in the centre with progressbar semantics", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <ConfidenceRing confidence={0.72} emoji="🐕" state="relaxed" />
      </LanguageProvider>,
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('Confiança');
    expect(markup).toContain("Média</");
  });
});
