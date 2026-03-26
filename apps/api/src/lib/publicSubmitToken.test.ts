import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { verifyPublicSubmitToken } from "./publicSubmitToken";
import { PUBLIC_SUBMIT_ERROR_CODES } from "../config/publicAntiSpam";

describe("verifyPublicSubmitToken", () => {
  it("rejects missing token", async () => {
    const r = await verifyPublicSubmitToken(undefined, "pid");
    expect(r).toEqual({ ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN });
  });

  it("rejects invalid token string", async () => {
    const r = await verifyPublicSubmitToken("not-a.jwt", "pid");
    expect(r).toEqual({ ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN });
  });

  it("rejects expired token", async () => {
    const secret = new TextEncoder().encode(process.env.PUBLIC_SUBMIT_TOKEN_SECRET!);
    const token = await new SignJWT({ pid: "pubx" })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("j1")
      .setIssuedAt(new Date("2020-01-01T00:00:00Z"))
      .setNotBefore(new Date("2020-01-01T00:00:00Z"))
      .setExpirationTime(new Date("2020-01-02T00:00:00Z"))
      .sign(secret);

    const r = await verifyPublicSubmitToken(token, "pubx");
    expect(r).toEqual({ ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.EXPIRED_SUBMIT_TOKEN });
  });

  it("rejects wrong public id", async () => {
    const secret = new TextEncoder().encode(process.env.PUBLIC_SUBMIT_TOKEN_SECRET!);
    const token = await new SignJWT({ pid: "a" })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("j2")
      .setIssuedAt(new Date())
      .setNotBefore(new Date(Date.now() - 60_000))
      .setExpirationTime(new Date(Date.now() + 3_600_000))
      .sign(secret);

    const r = await verifyPublicSubmitToken(token, "b");
    expect(r).toEqual({ ok: false, code: PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN });
  });
});
