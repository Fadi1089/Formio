import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } from "jose";

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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);

  // DEBUG: log alg so we can confirm ES256 is being used
  try {
    const { alg } = decodeProtectedHeader(token);
    console.log("[auth] token alg:", alg);
  } catch {
    console.log("[auth] could not decode token header");
  }

  jwtVerify(token, getJWKS())
    .then(({ payload }) => {
      if (!payload.sub) {
        res.status(401).json({ error: "Invalid token: missing subject" });
        return;
      }
      req.creatorId = payload.sub;
      next();
    })
    .catch((err: Error) => {
      console.error("[auth] jwtVerify failed:", err.name, err.message);
      res.status(401).json({ error: "Invalid or expired token" });
    });
}
