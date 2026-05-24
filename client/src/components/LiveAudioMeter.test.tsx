import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveAudioMeter } from "./LiveAudioMeter";

describe("LiveAudioMeter", () => {
  it("renders a live microphone level meter with waveform bars", () => {
    const markup = renderToStaticMarkup(
      <LiveAudioMeter level={0.64} waveform={[0.1, 0.4, 0.8, 0.2]} isActive />
    );

    expect(markup).toContain('role="meter"');
    expect(markup).toContain('aria-valuenow="64"');
    expect(markup).toContain("Streaming áudio em tempo real");
    expect(markup).toContain("64%");
    expect(markup.match(/data-audio-bar="true"/g)?.length).toBe(4);
  });
});
