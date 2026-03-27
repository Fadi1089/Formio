"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type PublicForm,
  type PublicQuestion,
  type QuestionType,
  PUBLIC_FORM_HONEYPOT_FIELD,
  submitResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Answers = Record<string, string | string[]>;

// ── Question renderers ────────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: PublicQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const { type, options, scaleMin, scaleMax } = question;

  const strValue = typeof value === "string" ? value : "";
  const arrValue = Array.isArray(value) ? value : [];

  switch (type as QuestionType) {
    case "NO_RESPONSE":
      return null;

    case "SHORT_TEXT":
      return (
        <Input
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      );

    case "LONG_TEXT":
      return (
        <Textarea
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          rows={4}
        />
      );

    case "DATE":
      return (
        <Input
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "TIME":
      return (
        <Input
          type="time"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "DROPDOWN":
      return (
        <select
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-3 focus:ring-ring/50"
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "SINGLE_CHOICE":
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name={question.id}
                value={opt.id}
                checked={arrValue[0] === opt.id}
                onChange={() => onChange([opt.id])}
                className="h-4 w-4"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case "MULTIPLE_CHOICE":
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                value={opt.id}
                checked={arrValue.includes(opt.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...arrValue, opt.id]);
                  } else {
                    onChange(arrValue.filter((id) => id !== opt.id));
                  }
                }}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case "LINEAR_SCALE": {
      const min = scaleMin ?? 1;
      const max = scaleMax ?? 5;
      const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="flex flex-wrap gap-2">
          {steps.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${
                strValue === String(n)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    default:
      return (
        <Input
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
        />
      );
  }
}

// ── Main form component ───────────────────────────────────────────────────────

const CHOICE_TYPES = new Set<QuestionType>([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
]);

const SUBMITTED_KEY = (id: string) => `form_submitted_${id}`;

export function FormResponse({
  form,
  publicId,
}: {
  form: PublicForm;
  publicId: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem(SUBMITTED_KEY(publicId))) {
      setAlreadySubmitted(true);
    }
  }, [publicId]);

  useEffect(() => {
    const delay = form.minSubmitDelayMs;
    const t = window.setTimeout(() => setCanSubmit(true), delay);
    return () => window.clearTimeout(t);
  }, [form.minSubmitDelayMs]);

  const allQuestions = form.sections.flatMap((s) => s.questions);

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side required validation
    for (const q of allQuestions) {
      if (q.type === "NO_RESPONSE") continue;
      if (!q.required) continue;
      const ans = answers[q.id];
      const isChoice = CHOICE_TYPES.has(q.type as QuestionType);
      if (isChoice) {
        if (!ans || (Array.isArray(ans) && ans.length === 0)) {
          setError(`Please answer: "${q.label}"`);
          return;
        }
      } else {
        if (!ans || (typeof ans === "string" && !ans.trim())) {
          setError(`Please answer: "${q.label}"`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payload = allQuestions
        .filter((q) => {
          if (q.type === "NO_RESPONSE") return false;
          const ans = answers[q.id];
          return ans !== undefined && ans !== "" && !(Array.isArray(ans) && ans.length === 0);
        })
        .map((q) => {
          const isChoice = CHOICE_TYPES.has(q.type as QuestionType);
          const raw = answers[q.id];
          if (isChoice) {
            const ids = Array.isArray(raw) ? raw : [raw as string];
            return { questionId: q.id, optionIds: ids };
          }
          return { questionId: q.id, value: raw as string };
        });

      await submitResponse(publicId, {
        submitToken: form.submitToken,
        answers: payload,
        [PUBLIC_FORM_HONEYPOT_FIELD]: honeypotRef.current?.value ?? "",
      });
      localStorage.setItem(SUBMITTED_KEY(publicId), "1");
      router.push(`/f/${publicId}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (alreadySubmitted) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center space-y-2">
        <p className="font-medium">You&apos;ve already submitted a response to this form.</p>
        <p className="text-sm text-muted-foreground">Thank you for your response!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6">
      <div
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor={`hp-${publicId}`}>Company website</label>
        <input
          ref={honeypotRef}
          id={`hp-${publicId}`}
          type="text"
          name={PUBLIC_FORM_HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      {form.sections.map((section) => (
        <div key={section.id} className="space-y-6">
          {section.title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
          )}

          {section.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-lg border bg-card p-5 space-y-3"
            >
              {/* Question media */}
              {question.media && (
                <div className="rounded-md overflow-hidden">
                  {question.media.type === "IMAGE" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.media.url}
                      alt={question.media.fileName}
                      className="max-h-64 w-full object-cover"
                    />
                  )}
                  {question.media.type === "AUDIO" && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls src={question.media.url} className="w-full" />
                  )}
                  {question.media.type === "VIDEO" && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      controls
                      src={question.media.url}
                      className="max-h-64 w-full rounded"
                    />
                  )}
                </div>
              )}

              <Label className="text-base font-medium leading-snug">
                {question.label}
                {question.required && question.type !== "NO_RESPONSE" && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>

              {question.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {question.description}
                </p>
              )}

              <QuestionField
                question={question}
                value={answers[question.id]}
                onChange={(v) => setAnswer(question.id, v)}
              />
            </div>
          ))}
        </div>
      ))}

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting || !canSubmit} size="lg">
        {submitting ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}
