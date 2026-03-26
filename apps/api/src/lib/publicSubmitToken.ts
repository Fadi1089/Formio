import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import {
  MIN_SUBMIT_DELAY_MS,
  SUBMIT_TOKEN_TTL_MS,
  PUBLIC_SUBMIT_ERROR_CODES,
  type PublicSubmitErrorCode,
} from "../config/publicAntiSpam";

const ALG = "HS256";

function getSigningSecret(): Uint8Array {
  const raw = process.env.PUBLIC_SUBMIT_TOKEN_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "PUBLIC_SUBMIT_TOKEN_SECRET must be set to a random string of at least 32 characters"
    );
  }
  return new TextEncoder().encode(raw);
}

export type PublicSubmitTokenPayload = {
  pid: string;
  jti: string;
};

export async function signPublicSubmitToken(publicId: string): Promise<string> {
  const secret = getSigningSecret();
  const now = Date.now();
  const issuedAt = new Date(now);
  const notBefore = new Date(now + MIN_SUBMIT_DELAY_MS);
  const expiresAt = new Date(now + SUBMIT_TOKEN_TTL_MS);

  return new SignJWT({ pid: publicId })
    .setProtectedHeader({ alg: ALG })
    .setJti(crypto.randomUUID())
    .setIssuedAt(issuedAt)
    .setNotBefore(notBefore)
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export type VerifyPublicSubmitTokenResult =
  | { ok: true; payload: PublicSubmitTokenPayload }
  | { ok: false; code: PublicSubmitErrorCode };

export async function verifyPublicSubmitToken(
  token: string | undefined,
  expectedPublicId: string
): Promise<VerifyPublicSubmitTokenResult> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
  }

  let secret: Uint8Array;
  try {
    secret = getSigningSecret();
  } catch {
    return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALG],
    });

    const pid = payload.pid;
    const jti = payload.jti;
    if (typeof pid !== "string" || typeof jti !== "string") {
      return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
    }
    if (pid !== expectedPublicId) {
      return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
    }

    return { ok: true, payload: { pid, jti } };
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) {
      return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.EXPIRED_SUBMIT_TOKEN };
    }
    if (e instanceof joseErrors.JWTClaimValidationFailed) {
      if (e.claim === "nbf") {
        return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.SUBMITTED_TOO_FAST };
      }
      return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
    }
    if (e instanceof joseErrors.JWSSignatureVerificationFailed) {
      return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
    }
    return { ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN };
  }
}
