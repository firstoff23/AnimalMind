// Unified backend HTTP client.
// Primary:  VITE_API_URL (or VITE_FASTAPI_URL) — Fly.io, 5 s timeout.
// Fallback: hardcoded HF Space — no timeout (best-effort).

const HF_SPACE_URL =
  (import.meta.env.VITE_HF_SPACE_URL as string | undefined) ||
  "https://firstoff-animalmind-backend.hf.space";

async function callBackend(endpoint: string, options: RequestInit): Promise<Response> {
  const primary =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (import.meta.env.VITE_FASTAPI_URL as string | undefined) ||
    "https://animalmind-backend.fly.dev";

  try {
    const res = await fetch(`${primary}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res;
    if (res.status === 429) {
      throw new Error("Demasiados pedidos. Tente novamente dentro de alguns instantes.");
    }
    throw new Error(`Primary failed: ${res.status}`);
  } catch (err: any) {
    if (err?.message?.includes("Demasiados pedidos")) {
      throw err;
    }
    // Fallback to HF Space (best-effort, no extra timeout)
    try {
      const fallbackRes = await fetch(`${HF_SPACE_URL}${endpoint}`, options);
      if (fallbackRes.ok) return fallbackRes;
      if (fallbackRes.status === 429) {
        throw new Error("Demasiados pedidos. Tente novamente dentro de alguns instantes.");
      }
      throw new Error(`Fallback failed: ${fallbackRes.status}`);
    } catch (fallbackErr: any) {
      if (fallbackErr?.message?.includes("Demasiados pedidos")) {
        throw fallbackErr;
      }
      throw fallbackErr;
    }
  }
}

export default callBackend;
