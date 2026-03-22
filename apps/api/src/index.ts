import "./loadEnv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import formsRouter from "./routes/forms";
import sectionsRouter from "./routes/sections";
import questionsRouter from "./routes/questions";
import publicRouter from "./routes/public";
import analyticsRouter from "./routes/analytics";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Private creator endpoints
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", formsRouter);
app.use("/api/v1", sectionsRouter);
app.use("/api/v1", questionsRouter);
app.use("/api/v1", analyticsRouter);

// Public unauthenticated endpoints
app.use("/api/v1/public", publicRouter);

// 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — catches any unhandled async errors forwarded via next(err)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
