import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic } from "./_core/serveStatic";

const app = express();

app.use((req, res, next) => {
  console.log(`[Request] Method: ${req.method}, URL: ${req.url}, Path: ${req.path}`);
  next();
});

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
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
    const port = parseInt(process.env.PORT || "3000");
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  };
  startLocalServer().catch(console.error);
}

export default app;
