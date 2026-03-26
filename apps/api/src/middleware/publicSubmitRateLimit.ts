import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  PUBLIC_SUBMIT_ERROR_CODES,
} from "../config/publicAntiSpam";

/**
 * Per-IP, per-public-form cap on POST /responses. Uses in-memory store (see README for multi-instance caveat).
 */
export const publicSubmitRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const pid = req.params.publicId ?? "";
    return `${pid}:${ipKeyGenerator(req.ip ?? "unknown")}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many submissions for this form. Please try again later.",
      code: PUBLIC_SUBMIT_ERROR_CODES.RATE_LIMITED,
    });
  },
});
