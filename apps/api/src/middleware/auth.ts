import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const devTiming = process.env.NODE_ENV === "development";

// Lazily initialized — env vars are not available until dotenv loads in index.ts.
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(
      new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );
  }
  return _jwks;
}

/** Fetch JWKS once at startup so the first real request does not pay cold JWKS latency. */
export async function prewarmJwks(): Promise<void> {
  const base = process.env.SUPABASE_URL;
  if (!base) {
    console.warn("[api] SUPABASE_URL missing; skip JWKS prewarm");
    return;
  }
  const url = `${base}/auth/v1/.well-known/jwks.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[api] JWKS prewarm failed: HTTP ${res.status}`);
    return;
  }
  await res.json();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  const t0 = devTiming ? Date.now() : 0;

  jwtVerify(token, getJWKS())
    .then(({ payload }) => {
      if (devTiming) {
        console.debug(`[api] jwtVerify ${Date.now() - t0}ms ${req.method} ${req.path}`);
      }
      if (!payload.sub) {
        res.status(401).json({ error: "Invalid token: missing subject" });
        return;
      }
      req.creatorId = payload.sub;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: "Invalid or expired token" });
    });
}
