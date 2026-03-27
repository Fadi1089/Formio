function readNonNegativeInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Minimum time after form load before submit is accepted (server-enforced via JWT `nbf`). Override with `PUBLIC_SUBMIT_MIN_DELAY_MS` (e.g. tests). */
export const MIN_SUBMIT_DELAY_MS = readNonNegativeInt("PUBLIC_SUBMIT_MIN_DELAY_MS", 1_000);

/** Stateless submit token lifetime from issue time. */
export const SUBMIT_TOKEN_TTL_MS = 60 * 60 * 1_000;

/** Rolling window for per-IP, per-form submission cap. */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;

/** Max submissions per IP per public form within RATE_LIMIT_WINDOW_MS. */
export const RATE_LIMIT_MAX = 3;

/**
 * JSON field on POST body — must be absent, empty, or whitespace-only.
 * Common bot honeypot name; not a real form question.
 */
export const HONEYPOT_FIELD_NAME = "website" as const;

export const PUBLIC_SUBMIT_ERROR_CODES = {
  INVALID_SUBMIT_TOKEN: "INVALID_SUBMIT_TOKEN",
  EXPIRED_SUBMIT_TOKEN: "EXPIRED_SUBMIT_TOKEN",
  SPAM_DETECTED: "SPAM_DETECTED",
  SUBMITTED_TOO_FAST: "SUBMITTED_TOO_FAST",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type PublicSubmitErrorCode =
  (typeof PUBLIC_SUBMIT_ERROR_CODES)[keyof typeof PUBLIC_SUBMIT_ERROR_CODES];
