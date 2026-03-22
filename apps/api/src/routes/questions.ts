import { Router } from "express";
import { z } from "zod";
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
