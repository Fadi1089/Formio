import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import formsRouter from "./routes/forms";
import sectionsRouter from "./routes/sections";
import questionsRouter from "./routes/questions";
import publicRouter from "./routes/public";
import analyticsRouter from "./routes/analytics";

export function createApp() {
  const app = express();

  const trust = process.env.TRUST_PROXY;
  if (trust === "1" || trust === "true") {
    app.set("trust proxy", 1);
  } else if (trust !== undefined && /^\d+$/.test(trust)) {
    app.set("trust proxy", parseInt(trust, 10));
  }

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", formsRouter);
  app.use("/api/v1", sectionsRouter);
  app.use("/api/v1", questionsRouter);
  app.use("/api/v1", analyticsRouter);
  app.use("/api/v1/public", publicRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
