import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfidenceRing } from "./ConfidenceRing";
import { LanguageProvider } from "../hooks/useLanguage";

describe("ConfidenceRing", () => {
  it("renders the confidence percentage in the centre with progressbar semantics", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider>
        <ConfidenceRing confidence={0.72} emoji="🐕" state="relaxed" />
      </LanguageProvider>
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="72"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain("Confiança da classificação: 72%");
    expect(markup).toContain(">72%</");
    expect(markup).toContain("🐕");
  });
});
