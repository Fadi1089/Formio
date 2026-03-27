import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

const QUESTION_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "LINEAR_SCALE",
  "DROPDOWN",
  "DATE",
  "TIME",
] as const;

const createQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  label: z.string().min(1, "Label is required"),
  description: z.string().nullable().optional(),
  required: z.boolean().default(false),
  scaleMin: z.number().int().nullable().optional(),
  scaleMax: z.number().int().nullable().optional(),
  scaleMinLabel: z.string().nullable().optional(),
  scaleMaxLabel: z.string().nullable().optional(),
  // Options may be supplied inline at creation time for choice questions.
  options: z.array(z.object({ label: z.string().min(1) })).optional(),
});

const createOptionSchema = z.object({
  label: z.string().min(1, "Label is required"),
});

const CHOICE_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"] as const;

function isChoiceType(t: (typeof QUESTION_TYPES)[number]): boolean {
  return (CHOICE_TYPES as readonly string[]).includes(t);
}

const updateQuestionSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  required: z.boolean().optional(),
  scaleMin: z.number().int().nullable().optional(),
  scaleMax: z.number().int().nullable().optional(),
  scaleMinLabel: z.string().nullable().optional(),
  scaleMaxLabel: z.string().nullable().optional(),
  options: z.array(z.object({ label: z.string().min(1) })).optional(),
});

async function syncChoiceOptions(
  tx: Prisma.TransactionClient,
  questionId: string,
  labels: string[]
) {
  const trimmed = labels.map((l) => l.trim()).filter((l) => l.length > 0);
  const existing = await tx.questionOption.findMany({
    where: { questionId },
    orderBy: { order: "asc" },
  });

  const n = trimmed.length;
  const m = existing.length;

  for (let i = 0; i < Math.min(n, m); i++) {
    if (existing[i].label !== trimmed[i] || existing[i].order !== i) {
      await tx.questionOption.update({
        where: { id: existing[i].id },
        data: { label: trimmed[i], order: i },
      });
    }
  }
  for (let i = m; i < n; i++) {
    await tx.questionOption.create({
      data: { questionId, label: trimmed[i], order: i },
    });
  }
  for (let i = n; i < m; i++) {
    try {
      await tx.questionOption.delete({ where: { id: existing[i].id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2003" || e.code === "P2014")
      ) {
        const err = new Error(
          "Cannot remove an option that already has responses"
        ) as Error & { status: number };
        err.status = 409;
        throw err;
      }
      throw e;
    }
  }
}

// POST /api/v1/forms/:formId/sections/:sectionId/questions
router.post(
  "/forms/:formId/sections/:sectionId/questions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = createQuestionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    // Verify the section belongs to a form owned by this creator.
    const section = await prisma.section.findFirst({
      where: {
        id: req.params.sectionId,
        formId: req.params.formId,
        form: { creatorId: req.creatorId },
      },
    });
    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const last = await prisma.question.findFirst({
      where: { sectionId: section.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (last?.order ?? -1) + 1;

    const { options: rawOptions, ...fields } = result.data;

    const question = await prisma.question.create({
      data: {
        sectionId: section.id,
        type: fields.type,
        label: fields.label,
        description: fields.description ?? null,
        required: fields.required,
        order,
        scaleMin: fields.scaleMin ?? null,
        scaleMax: fields.scaleMax ?? null,
        scaleMinLabel: fields.scaleMinLabel ?? null,
        scaleMaxLabel: fields.scaleMaxLabel ?? null,
        options: rawOptions?.length
          ? { create: rawOptions.map((o, i) => ({ label: o.label, order: i })) }
          : undefined,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        media: true,
      },
    });

    res.status(201).json(question);
  })
);

// PATCH /api/v1/questions/:questionId
router.patch(
  "/questions/:questionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = updateQuestionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    const body = result.data;
    if (Object.keys(body).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const question = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const isChoice = isChoiceType(question.type);

    try {
      await prisma.$transaction(async (tx) => {
        if (body.options !== undefined && isChoice) {
          await syncChoiceOptions(tx, question.id, body.options.map((o) => o.label));
        }

        const data: Prisma.QuestionUpdateInput = {};
        if (body.label !== undefined) data.label = body.label;
        if (body.description !== undefined) data.description = body.description;
        if (body.required !== undefined) data.required = body.required;
        if (body.scaleMin !== undefined) data.scaleMin = body.scaleMin;
        if (body.scaleMax !== undefined) data.scaleMax = body.scaleMax;
        if (body.scaleMinLabel !== undefined) data.scaleMinLabel = body.scaleMinLabel;
        if (body.scaleMaxLabel !== undefined) data.scaleMaxLabel = body.scaleMaxLabel;

        await tx.question.update({
          where: { id: question.id },
          data,
        });
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) {
        res.status(409).json({ error: err.message });
        return;
      }
      throw e;
    }

    const updated = await prisma.question.findUnique({
      where: { id: question.id },
      include: {
        options: { orderBy: { order: "asc" } },
        media: true,
      },
    });
    res.json(updated);
  })
);

// DELETE /api/v1/questions/:questionId
router.delete(
  "/questions/:questionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    await prisma.question.delete({ where: { id: question.id } });

    res.json({ ok: true });
  })
);

// POST /api/v1/questions/:questionId/duplicate
router.post(
  "/questions/:questionId/duplicate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const src = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!src) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: { sectionId: src.sectionId, order: { gt: src.order } },
        data: { order: { increment: 1 } },
      });

      return tx.question.create({
        data: {
          sectionId: src.sectionId,
          type: src.type,
          label: src.label,
          description: src.description,
          required: src.required,
          order: src.order + 1,
          scaleMin: src.scaleMin,
          scaleMax: src.scaleMax,
          scaleMinLabel: src.scaleMinLabel,
          scaleMaxLabel: src.scaleMaxLabel,
          options:
            src.options.length > 0
              ? {
                  create: src.options.map((o) => ({
                    label: o.label,
                    order: o.order,
                  })),
                }
              : undefined,
        },
        include: {
          options: { orderBy: { order: "asc" } },
          media: true,
        },
      });
    });

    res.status(201).json(created);
  })
);

// POST /api/v1/questions/:questionId/options
router.post(
  "/questions/:questionId/options",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = createOptionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    // Verify ownership through the relation chain: question → section → form → creator.
    const question = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const last = await prisma.questionOption.findFirst({
      where: { questionId: question.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (last?.order ?? -1) + 1;

    const option = await prisma.questionOption.create({
      data: { questionId: question.id, label: result.data.label, order },
    });

    res.status(201).json(option);
  })
);

// ── Media attachment ──────────────────────────────────────────────────────────

const MEDIA_TYPES = ["AUDIO", "IMAGE", "VIDEO"] as const;

const attachMediaSchema = z.object({
  type: z.enum(MEDIA_TYPES),
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  durationSeconds: z.number().int().positive().nullable().optional(),
});

// POST /api/v1/questions/:questionId/media
// Creates or replaces the media attachment for a question.
router.post(
  "/questions/:questionId/media",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = attachMediaSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid body" });
      return;
    }

    const question = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const { type, storageKey, fileName, mimeType, durationSeconds } = result.data;

    const media = await prisma.mediaAttachment.upsert({
      where: { questionId: question.id },
      create: { questionId: question.id, type, storageKey, fileName, mimeType, durationSeconds: durationSeconds ?? null },
      update: { type, storageKey, fileName, mimeType, durationSeconds: durationSeconds ?? null },
    });

    res.status(201).json(media);
  })
);

// DELETE /api/v1/questions/:questionId/media
router.delete(
  "/questions/:questionId/media",
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await prisma.question.findFirst({
      where: {
        id: req.params.questionId,
        section: { form: { creatorId: req.creatorId } },
      },
      include: { media: true },
    });
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    if (!question.media) {
      res.status(404).json({ error: "No media attachment found" });
      return;
    }

    await prisma.mediaAttachment.delete({ where: { questionId: question.id } });
    res.json({ ok: true });
  })
);

export default router;
