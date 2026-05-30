// Unified backend HTTP client.
// Primary:  VITE_API_URL (or VITE_FASTAPI_URL) — Fly.io, 5 s timeout.
// Fallback: hardcoded HF Space — no timeout (best-effort).

const HF_SPACE_URL = "https://firstoff-animalmind-backend.hf.space";

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
    throw new Error(`Primary failed: ${res.status}`);
  } catch {
    // Fallback to HF Space (best-effort, no extra timeout)
    return fetch(`${HF_SPACE_URL}${endpoint}`, options);
  }
}

export default callBackend;
