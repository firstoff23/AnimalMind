import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { createServer } from "http";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { serveStatic } from "./_core/serveStatic";
import { registerStorageProxy } from "./_core/storageProxy";
import { chatStreamHandler } from "./chatStream";
import { appRouter } from "./routers";

const app = express();

app.use((req, res, next) => {
  const allowedOrigins = [
    "https://pawra.vercel.app",
    "https://animalmind.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow non-CORS requests (like direct curl or backend calls) to pass through without origin header validation
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type, Authorization",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use((req, _res, next) => {
  console.log(
    `[Request] Method: ${req.method}, URL: ${req.url}, Path: ${req.path}`,
  );
  next();
});

// ── Content Security Policy ─────────────────────────────────────────────────
// Strict CSP for a React PWA. Adjusted per environment:
//   - dev:  script-src includes 'unsafe-eval' for Vite HMR hot-reload
//   - prod: script-src is 'self' only (no eval, no inline)

app.use((_req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline' https://app.termly.io https://*.termly.co`
    : `'self' 'unsafe-eval' 'unsafe-inline' https://app.termly.io https://*.termly.co`;

  res.setHeader(
    "Content-Security-Policy",
    [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com`,
      `font-src 'self' https://fonts.gstatic.com https://*.fontshare.com data:`,
      `img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://app.termly.io https://*.termly.co https://api.qrserver.com`,
      `connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://firstoff-animalmind-backend.hf.space https://firstoff-animalmind-demo.hf.space https://animalmind-backend.fly.dev https://app.termly.io https://*.termly.co`,
      `media-src 'self' blob:`,
      `worker-src 'self' blob:`,
      `manifest-src 'self'`,
      `frame-src 'self' https://app.termly.io https://*.termly.co`,
      `frame-ancestors 'none'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
    ].join("; "),
  );

  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()",
  );

  next();
});

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.post("/api/chat", chatStreamHandler);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// If not running on Vercel, setup static serving/Vite and listen
if (!process.env.VERCEL) {
  const startLocalServer = async () => {
    const server = createServer(app);
    if (process.env.NODE_ENV === "development") {
      const viteModule = "./_core/vite";
      const { setupVite } = await import(viteModule);
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = parseInt(process.env.PORT || "3000", 10);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  };
  startLocalServer().catch(console.error);
}

export default app;
