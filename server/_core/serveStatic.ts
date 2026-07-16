import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Allow E2E tests (tsx server/index.ts + NODE_ENV=production) to override
  // the static directory, since import.meta.dirname resolves to server/_core/
  // instead of the bundled dist/ when running unbundled via tsx.
  const distPath = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
