import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

const upsertCreatorSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

// POST /api/v1/auth/me
// Upserts the Creator record on every sign-in. Must be called by the web app
// immediately after Supabase returns a session so the DB record stays in sync.
router.post(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = upsertCreatorSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    const { email, name, avatarUrl } = result.data;

    const creator = await prisma.creator.upsert({
      where: { id: req.creatorId },
      create: {
        id: req.creatorId,
        email,
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      update: {
        name: name ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
    });

    res.json(creator);
  })
);

// GET /api/v1/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const creator = await prisma.creator.findUnique({
      where: { id: req.creatorId },
    });

    if (!creator) {
      res.status(404).json({ error: "Creator not found. Call POST /auth/me first." });
      return;
    }

    res.json(creator);
  })
);

export default router;
