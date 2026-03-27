import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import {
  HONEYPOT_FIELD_NAME,
  MIN_SUBMIT_DELAY_MS,
  PUBLIC_SUBMIT_ERROR_CODES,
} from "../config/publicAntiSpam";
import { signPublicSubmitToken, verifyPublicSubmitToken } from "../lib/publicSubmitToken";
import { sendPublicSubmitError } from "../lib/publicSubmitErrors";
import { publicSubmitRateLimiter } from "../middleware/publicSubmitRateLimit";

const router = Router();

const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"]);
const NON_ANSWERABLE_TYPES = new Set(["NO_RESPONSE"]);

// Constructs a public Supabase Storage URL from a storage key.
// Assumes the "media" bucket is configured as public. The raw storageKey
// is never sent to the client.
function buildMediaUrl(storageKey: string): string {
  const base = process.env.SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/media/${storageKey}`;
}

// GET /api/v1/public/forms/:publicId
router.get(
  "/forms/:publicId",
  asyncHandler(async (req, res) => {
    const form = await prisma.form.findFirst({
      where: { publicId: req.params.publicId, isPublished: true },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                options: { orderBy: { order: "asc" } },
                media: true,
              },
            },
          },
        },
      },
    });

    // Return 404 regardless of whether the form exists but is unpublished —
    // never confirm a private form's existence to a public caller.
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }

    let submitToken: string;
    try {
      submitToken = await signPublicSubmitToken(form.publicId);
    } catch (err) {
      console.error("[public] submit token signing failed:", err);
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    // Shape: strip internal fields, replace storageKey with a public URL.
    res.json({
      publicId: form.publicId,
      title: form.title,
      description: form.description,
      submitToken,
      minSubmitDelayMs: MIN_SUBMIT_DELAY_MS,
      sections: form.sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        questions: section.questions.map((question) => ({
          id: question.id,
          type: question.type,
          label: question.label,
          description: question.description,
          required: question.required,
          order: question.order,
          scaleMin: question.scaleMin,
          scaleMax: question.scaleMax,
          scaleMinLabel: question.scaleMinLabel,
          scaleMaxLabel: question.scaleMaxLabel,
          options: question.options.map((o) => ({
            id: o.id,
            label: o.label,
            order: o.order,
          })),
          media: question.media
            ? {
              type: question.media.type,
              url: buildMediaUrl(question.media.storageKey),
              fileName: question.media.fileName,
              mimeType: question.media.mimeType,
              durationSeconds: question.media.durationSeconds,
            }
            : null,
        })),
      })),
    });
  })
);

// POST /api/v1/public/forms/:publicId/responses
const submitResponseSchema = z
  .object({
    submitToken: z.string().min(1),
    answers: z.array(
      z.object({
        questionId: z.string(),
        value: z.string().optional().nullable(),
        optionIds: z.array(z.string()).optional(),
      })
    ),
  })
  .extend({
    [HONEYPOT_FIELD_NAME]: z.string().optional().default(""),
  });

router.post(
  "/forms/:publicId/responses",
  publicSubmitRateLimiter,
  asyncHandler(async (req, res) => {
    const result = submitResponseSchema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.join(".");
      if (path === "submitToken") {
        sendPublicSubmitError(res, PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN);
        return;
      }
      res.status(400).json({ error: issue?.message ?? "Invalid body" });
      return;
    }

    const honeypot = result.data[HONEYPOT_FIELD_NAME]?.trim() ?? "";
    if (honeypot.length > 0) {
      sendPublicSubmitError(res, PUBLIC_SUBMIT_ERROR_CODES.SPAM_DETECTED);
      return;
    }

    const tokenCheck = await verifyPublicSubmitToken(
      result.data.submitToken,
      req.params.publicId
    );
    if (!tokenCheck.ok) {
      sendPublicSubmitError(res, tokenCheck.code);
      return;
    }

    const form = await prisma.form.findFirst({
      where: { publicId: req.params.publicId, isPublished: true },
      include: {
        sections: {
          include: {
            questions: { include: { options: { select: { id: true } } } },
          },
        },
      },
    });

    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }

    const allQuestions = form.sections.flatMap((s) => s.questions);
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
    const { answers } = result.data;

    // All submitted questionIds must belong to this form.
    for (const answer of answers) {
      if (!questionMap.has(answer.questionId)) {
        res.status(422).json({ error: "Invalid questionId", field: answer.questionId });
        return;
      }
    }

    // Every required question must have an answer.
    const answeredIds = new Set(answers.map((a) => a.questionId));
    for (const question of allQuestions.filter((q) => q.required && !NON_ANSWERABLE_TYPES.has(String(q.type)))) {
      if (!answeredIds.has(question.id)) {
        res.status(422).json({
          error: "Required question not answered",
          field: question.id,
        });
        return;
      }
    }

    // Per-answer validation.
    for (const answer of answers) {
      const question = questionMap.get(answer.questionId)!;

      if (NON_ANSWERABLE_TYPES.has(String(question.type))) {
        res.status(422).json({
          error: "Answers are not allowed for no-response questions",
          field: answer.questionId,
        });
        return;
      }

      if (CHOICE_TYPES.has(question.type)) {
        if (!answer.optionIds || answer.optionIds.length === 0) {
          res.status(422).json({
            error: "optionIds required for choice questions",
            field: answer.questionId,
          });
          return;
        }
        if (
          (question.type === "SINGLE_CHOICE" || question.type === "DROPDOWN") &&
          answer.optionIds.length > 1
        ) {
          res.status(422).json({
            error: "Only one option allowed for this question type",
            field: answer.questionId,
          });
          return;
        }
        const validOptionIds = new Set(question.options.map((o) => o.id));
        for (const optionId of answer.optionIds) {
          if (!validOptionIds.has(optionId)) {
            res.status(422).json({ error: "Invalid optionId", field: answer.questionId });
            return;
          }
        }
      }
    }

    // Persist the response and all answers atomically.
    // For long forms, createMany batches reduce DB round trips significantly.
    const response = await prisma.$transaction(async (tx) => {
      const createdResponse = await tx.response.create({
        data: { formId: form.id },
        select: { id: true, submittedAt: true },
      });

      const answerRows: Array<{
        id: string;
        responseId: string;
        questionId: string;
        value: string | null;
      }> = [];
      const answerOptionRows: Array<{
        id: string;
        answerId: string;
        questionOptionId: string;
      }> = [];

      for (const answer of answers) {
        const question = questionMap.get(answer.questionId)!;
        const isChoice = CHOICE_TYPES.has(question.type);
        const answerId = randomUUID();

        answerRows.push({
          id: answerId,
          responseId: createdResponse.id,
          questionId: answer.questionId,
          value: isChoice ? null : (answer.value ?? null),
        });

        if (isChoice && answer.optionIds?.length) {
          for (const optionId of answer.optionIds) {
            answerOptionRows.push({
              id: randomUUID(),
              answerId,
              questionOptionId: optionId,
            });
          }
        }
      }

      if (answerRows.length > 0) {
        await tx.answer.createMany({ data: answerRows });
      }
      if (answerOptionRows.length > 0) {
        await tx.answerOption.createMany({ data: answerOptionRows });
      }

      return createdResponse;
    });

    res.status(201).json({
      responseId: response.id,
      submittedAt: response.submittedAt,
    });
  })
);

export default router;
