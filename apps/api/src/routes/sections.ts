import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

const createSectionSchema = z.object({
  title: z.string().nullable().optional(),
});

// POST /api/v1/forms/:formId/sections
router.post(
  "/forms/:formId/sections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = createSectionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    const form = await prisma.form.findUnique({
      where: { id: req.params.formId, creatorId: req.creatorId },
    });
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }

    const last = await prisma.section.findFirst({
      where: { formId: form.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (last?.order ?? -1) + 1;

    const section = await prisma.section.create({
      data: { formId: form.id, title: result.data.title ?? null, order },
      include: { questions: true },
    });

    res.status(201).json(section);
  })
);

export default router;
