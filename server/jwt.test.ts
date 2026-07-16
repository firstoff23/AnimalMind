import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

describe("JWT 'alg none' attack protection", () => {
  it("deve rejeitar um token assinado com alg: none", async () => {
    const header = JSON.stringify({ alg: "none", typ: "JWT" });
    const payload = JSON.stringify({
      openId: "test-user-id",
      appId: "test-app-id",
      name: "Test User",
    });
    const jwtToken = `${base64url(header)}.${base64url(payload)}.`;
    const session = await sdk.verifySession(jwtToken);
    expect(session).toBeNull();
  });
});
