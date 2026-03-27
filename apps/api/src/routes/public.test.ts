import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { SignJWT } from "jose";

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    form: { findFirst: prismaMocks.findFirst },
    $transaction: prismaMocks.transaction,
  },
}));

import { createApp } from "../app";
import { signPublicSubmitToken } from "../lib/publicSubmitToken";
import { PUBLIC_SUBMIT_ERROR_CODES } from "../config/publicAntiSpam";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function formForPublicId(publicId: string) {
  return {
    id: "f1",
    publicId,
    isPublished: true,
    sections: [
      {
        questions: [
          {
            id: "q1",
            type: "SHORT_TEXT",
            required: true,
            options: [] as { id: string }[],
          },
        ],
      },
    ],
  };
}

describe("POST /api/v1/public/forms/:publicId/responses", () => {
  beforeEach(() => {
    prismaMocks.findFirst.mockReset();
    prismaMocks.transaction.mockReset();
  });

  it("returns 201 for valid submission after min delay", async () => {
    const publicId = "pub-valid-1";
    const app = createApp();
    const token = await signPublicSubmitToken(publicId);
    await sleep(1200);

    prismaMocks.findFirst.mockResolvedValue(formForPublicId(publicId));
    prismaMocks.transaction.mockImplementation(async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        response: {
          create: vi.fn().mockResolvedValue({
            id: "r1",
            submittedAt: new Date(),
          }),
        },
        answer: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        answerOption: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      };
      return cb(tx);
    });

    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        submitToken: token,
        answers: [{ questionId: "q1", value: "hello" }],
        website: "",
      });

    expect(res.status).toBe(201);
    expect(res.body.responseId).toBe("r1");
  });

  it("rejects missing submitToken", async () => {
    const publicId = "pub-miss-1";
    const app = createApp();
    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        answers: [{ questionId: "q1", value: "x" }],
        website: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN);
  });

  it("rejects invalid submit token", async () => {
    const publicId = "pub-bad-1";
    const app = createApp();
    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        submitToken: "garbage",
        answers: [{ questionId: "q1", value: "x" }],
        website: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN);
  });

  it("rejects expired submit token", async () => {
    const publicId = "pub-exp-1";
    const app = createApp();
    const secret = new TextEncoder().encode(process.env.PUBLIC_SUBMIT_TOKEN_SECRET!);
    const token = await new SignJWT({ pid: publicId })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("j1")
      .setIssuedAt(new Date("2020-01-01T00:00:00Z"))
      .setNotBefore(new Date("2020-01-01T00:00:00Z"))
      .setExpirationTime(new Date("2020-01-02T00:00:00Z"))
      .sign(secret);

    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        submitToken: token,
        answers: [{ questionId: "q1", value: "x" }],
        website: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.EXPIRED_SUBMIT_TOKEN);
  });

  it("rejects submit before nbf (too fast)", async () => {
    const publicId = "pub-fast-1";
    const app = createApp();
    const token = await signPublicSubmitToken(publicId);

    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        submitToken: token,
        answers: [{ questionId: "q1", value: "x" }],
        website: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.SUBMITTED_TOO_FAST);
  });

  it("rejects non-empty honeypot", async () => {
    const publicId = "pub-hp-1";
    const app = createApp();
    const token = await signPublicSubmitToken(publicId);
    await sleep(1200);

    const res = await request(app)
      .post(`/api/v1/public/forms/${publicId}/responses`)
      .send({
        submitToken: token,
        answers: [{ questionId: "q1", value: "x" }],
        website: "https://spam.example",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.SPAM_DETECTED);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const app = createApp();
    const id = `pubrate-${Date.now()}`;
    const path = `/api/v1/public/forms/${id}/responses`;

    for (let i = 0; i < 3; i++) {
      const r = await request(app).post(path).send({});
      expect(r.status).toBe(400);
    }

    const res = await request(app).post(path).send({});
    expect(res.status).toBe(429);
    expect(res.body.code).toBe(PUBLIC_SUBMIT_ERROR_CODES.RATE_LIMITED);
  });
});
