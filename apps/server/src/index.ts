import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { ANALYSIS_VERSION } from "./config";
import fs from "fs";
import path from "path";

import resolveProductRouter from "./routes/resolveProduct";
import checkDealRouter from "./routes/checkDeal";

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin =
  configuredOrigins.length === 1 && configuredOrigins[0] === "*"
    ? "*"
    : configuredOrigins.length
      ? configuredOrigins
      : "*";

app.disable("x-powered-by");
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "100kb", strict: true }));

app.use("/api/resolve-product", resolveProductRouter);
app.use("/api/check-deal", checkDealRouter);

app.get("/api/health", (_req, res) => {
  const llmConfigured = Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim(),
  );
  res.json({
    status: "ok",
    serpapi: process.env.SERPAPI_KEY?.trim() ? "loaded" : "missing",
    provider: process.env.SERPAPI_KEY?.trim() ? "configured" : "unconfigured",
    llm: llmConfigured
      ? "configured (optional)"
      : "missing (deterministic rationale)",
    version: ANALYSIS_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Serve an already-built web app when this server is deployed as a single unit.
// API routes remain authoritative and no frontend source is bundled here.
const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(path.join(webDist, "index.html"))) {
  app.use(express.static(webDist, { index: "index.html" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    (error as { type?: string }).type === "entity.too.large"
  ) {
    return res.status(413).json({ error: "Request body is too large." });
  }
  if (error instanceof SyntaxError)
    return res.status(400).json({ error: "Request body must be valid JSON." });
  return res.status(500).json({ error: "Unexpected server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PriceHonest API listening on port ${PORT}`);
    console.log(
      `SerpApi provider: ${process.env.SERPAPI_KEY?.trim() ? "configured" : "not configured"}`,
    );
    console.log(
      `Optional LLM: ${process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() ? "configured" : "deterministic rationale"}`,
    );
  });
}

export default app;
