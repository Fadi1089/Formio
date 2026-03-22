import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"]);

// GET /api/v1/forms/:formId/analytics
router.get(
  "/forms/:formId/analytics",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { creatorId: true },
    });
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    if (form.creatorId !== req.creatorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Total response count
    const totalResponses = await prisma.response.count({ where: { formId } });

    // Timeline — group response timestamps by calendar day (YYYY-MM-DD)
    const allResponses = await prisma.response.findMany({
      where: { formId },
      select: { submittedAt: true },
      orderBy: { submittedAt: "asc" },
    });

    const dayCounts: Record<string, number> = {};
    for (const r of allResponses) {
      const day = r.submittedAt.toISOString().slice(0, 10);
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    }
    const timeline = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

    // Load questions in display order (section order → question order)
    const sections = await prisma.section.findMany({
      where: { formId },
      orderBy: { order: "asc" },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
    const questions = sections.flatMap((s) => s.questions);

    const questionAnalytics = await Promise.all(
      questions.map(async (question) => {
        const totalAnswers = await prisma.answer.count({
          where: { questionId: question.id, response: { formId } },
        });

        const base = {
          questionId: question.id,
          label: question.label,
          type: question.type,
          totalAnswers,
        };

        // Choice distribution — count how many times each option was selected.
        // Uses findMany + in-memory aggregation to avoid groupBy type complexity.
        if (CHOICE_TYPES.has(question.type)) {
          const selections = await prisma.answerOption.findMany({
            where: {
              answer: { questionId: question.id, response: { formId } },
            },
            select: { questionOptionId: true },
          });

          const countByOption = new Map<string, number>();
          for (const s of selections) {
            countByOption.set(
              s.questionOptionId,
              (countByOption.get(s.questionOptionId) ?? 0) + 1
            );
          }

          const distribution = question.options.map((opt) => {
            const count = countByOption.get(opt.id) ?? 0;
            return {
              optionId: opt.id,
              label: opt.label,
              count,
              percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
            };
          });

          return { ...base, distribution };
        }

        // Linear scale — average and per-value frequency counts.
        if (question.type === "LINEAR_SCALE") {
          const scaleAnswers = await prisma.answer.findMany({
            where: {
              questionId: question.id,
              response: { formId },
              value: { not: null },
            },
            select: { value: true },
          });

          const values = scaleAnswers
            .map((a) => Number(a.value))
            .filter((n) => !isNaN(n));

          const average =
            values.length > 0
              ? Math.round(
                  (values.reduce((sum, v) => sum + v, 0) / values.length) * 100
                ) / 100
              : null;

          const rawCounts: Record<number, number> = {};
          for (const v of values) rawCounts[v] = (rawCounts[v] ?? 0) + 1;

          const scaleCounts = Object.entries(rawCounts)
            .map(([value, count]) => ({ value: Number(value), count }))
            .sort((a, b) => a.value - b.value);

          return { ...base, average, scaleCounts };
        }

        // Text types (SHORT_TEXT, LONG_TEXT, DATE, TIME) — list of submitted values.
        const textAnswers = await prisma.answer.findMany({
          where: {
            questionId: question.id,
            response: { formId },
            value: { not: null },
          },
          select: { value: true },
          orderBy: { id: "desc" },
          take: 100,
        });

        return { ...base, textResponses: textAnswers.map((a) => a.value!) };
      })
    );

    res.json({ formId, totalResponses, timeline, questions: questionAnalytics });
  })
);

// GET /api/v1/forms/:formId/responses
// Returns all raw per-response data for CSV export. Owner-only.
router.get(
  "/forms/:formId/responses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { formId } = req.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { creatorId: true, title: true },
    });
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    if (form.creatorId !== req.creatorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const sections = await prisma.section.findMany({
      where: { formId },
      orderBy: { order: "asc" },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: { id: true, label: true, type: true },
        },
      },
    });
    const questions = sections.flatMap((s) => s.questions);

    const responses = await prisma.response.findMany({
      where: { formId },
      orderBy: { submittedAt: "asc" },
      include: {
        answers: {
          include: {
            answerOptions: {
              include: { questionOption: { select: { label: true } } },
            },
          },
        },
      },
    });

    res.json({
      formTitle: form.title,
      questions: questions.map((q) => ({ id: q.id, label: q.label, type: q.type })),
      responses: responses.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt.toISOString(),
        // answers keyed by questionId:
        //   choice questions → string[] of selected option labels
        //   all other types  → raw value string (or "" if unanswered)
        answers: Object.fromEntries(
          r.answers.map((a) => {
            if (a.answerOptions.length > 0) {
              return [a.questionId, a.answerOptions.map((ao) => ao.questionOption.label)];
            }
            return [a.questionId, a.value ?? ""];
          })
        ),
      })),
    });
  })
);

export default router;
