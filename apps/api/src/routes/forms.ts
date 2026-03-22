import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Reusable Prisma include for a full form (builder view).
// Defined inline in each query so Prisma can properly infer the return type.
function fullFormInclude() {
  return {
    sections: {
      orderBy: { order: "asc" as const },
      include: {
        questions: {
          orderBy: { order: "asc" as const },
          include: {
            options: { orderBy: { order: "asc" as const } },
            media: true,
          },
        },
      },
    },
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/v1/forms
router.get(
  "/forms",
  requireAuth,
  asyncHandler(async (req, res) => {
    const forms = await prisma.form.findMany({
      where: { creatorId: req.creatorId },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ forms });
  })
);

// POST /api/v1/forms
const createFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
});

router.post(
  "/forms",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = createFormSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    const form = await prisma.form.create({
      data: {
        creatorId: req.creatorId,
        title: result.data.title,
        description: result.data.description ?? null,
        // Every form gets a default section so the builder always has
        // somewhere to add the first question.
        sections: {
          create: { title: null, order: 0 },
        },
      },
      include: fullFormInclude(),
    });

    res.status(201).json(form);
  })
);

// GET /api/v1/forms/:formId
router.get(
  "/forms/:formId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const form = await prisma.form.findUnique({
      where: { id: req.params.formId },
      include: fullFormInclude(),
    });

    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    if (form.creatorId !== req.creatorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(form);
  })
);

// PATCH /api/v1/forms/:formId
const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

router.patch(
  "/forms/:formId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = updateFormSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }
    if (Object.keys(result.data).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const form = await prisma.form.findUnique({
      where: { id: req.params.formId, creatorId: req.creatorId },
    });
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: result.data,
      select: { id: true, title: true, description: true, updatedAt: true },
    });

    res.json(updated);
  })
);

// POST /api/v1/forms/:formId/publish
router.post(
  "/forms/:formId/publish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const form = await prisma.form.findUnique({
      where: { id: req.params.formId },
      include: {
        sections: { include: { questions: { take: 1 } } },
      },
    });

    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    if (form.creatorId !== req.creatorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const hasQuestions = form.sections.some((s) => s.questions.length > 0);
    if (!hasQuestions) {
      res.status(422).json({
        error: "Form must have at least one question before publishing",
      });
      return;
    }

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: {
        isPublished: true,
        // Record the first publish time; don't overwrite on re-publish.
        publishedAt: form.publishedAt ?? new Date(),
      },
      select: { id: true, isPublished: true, publicId: true, publishedAt: true },
    });

    res.json(updated);
  })
);

// POST /api/v1/forms/:formId/unpublish
router.post(
  "/forms/:formId/unpublish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const form = await prisma.form.findUnique({
      where: { id: req.params.formId, creatorId: req.creatorId },
    });
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: { isPublished: false },
      select: { id: true, isPublished: true },
    });

    res.json(updated);
  })
);

export default router;
