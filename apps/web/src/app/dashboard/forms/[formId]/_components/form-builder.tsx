"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  type Form,
  type Question,
  type BuilderMedia,
  type MediaType,
  type CreateQuestionInput,
  type UpdateQuestionInput,
  type QuestionType,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  getForm,
  publishForm,
  unpublishForm,
  attachMedia,
  removeMedia,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  LINEAR_SCALE: "Linear scale",
  DROPDOWN: "Dropdown",
  DATE: "Date",
  TIME: "Time",
};

const CHOICE_TYPES = new Set<QuestionType>([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
]);

const SCALE_TYPE: QuestionType = "LINEAR_SCALE";

const FormAccessTokenContext = createContext<(() => Promise<string | null>) | null>(
  null
);

function useFormAccessToken() {
  const fn = useContext(FormAccessTokenContext);
  if (!fn) {
    throw new Error("useFormAccessToken must be used within FormBuilder");
  }
  return fn;
}

// ── Add Question Form ─────────────────────────────────────────────────────────

function AddQuestionForm({
  formId,
  sectionId,
  onAdded,
  onCancel,
}: {
  formId: string;
  sectionId: string;
  onAdded: (q: Question) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>("SHORT_TEXT");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChoice = CHOICE_TYPES.has(type);
  const isScale = type === SCALE_TYPE;
  const getAccessToken = useFormAccessToken();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;

      const input: CreateQuestionInput = {
        type,
        label: label.trim(),
        required,
        ...(isChoice && {
          options: options.filter((o) => o.trim()).map((o) => ({ label: o.trim() })),
        }),
        ...(isScale && { scaleMin, scaleMax }),
      };

      const question = await createQuestion(token, formId, sectionId, input);
      onAdded(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add question");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-muted/40 p-4 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="q-label">Question</Label>
          <Input
            id="q-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Question text"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-type">Type</Label>
          <select
            id="q-type"
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-3 focus:ring-ring/50"
          >
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isChoice && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOptions([...options, ""])}
          >
            + Add option
          </Button>
        </div>
      )}

      {isScale && (
        <div className="flex items-end gap-4">
          <div className="space-y-1.5 w-24">
            <Label htmlFor="scale-min">Min</Label>
            <Input
              id="scale-min"
              type="number"
              value={scaleMin}
              onChange={(e) => setScaleMin(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 w-24">
            <Label htmlFor="scale-max">Max</Label>
            <Input
              id="scale-max"
              type="number"
              value={scaleMax}
              onChange={(e) => setScaleMax(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="q-required"
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="q-required" className="font-normal cursor-pointer">
          Required
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !label.trim()}>
          {loading ? "Adding…" : "Add question"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Edit Question Form ────────────────────────────────────────────────────────

function EditQuestionForm({
  question,
  onSaved,
  onCancel,
}: {
  question: Question;
  onSaved: (q: Question) => void;
  onCancel: () => void;
}) {
  const [type] = useState<QuestionType>(question.type);
  const [label, setLabel] = useState(question.label);
  const [required, setRequired] = useState(question.required);
  const [options, setOptions] = useState<string[]>(() =>
    question.options.length > 0
      ? question.options.map((o) => o.label)
      : ["", ""]
  );
  const [scaleMin, setScaleMin] = useState(question.scaleMin ?? 1);
  const [scaleMax, setScaleMax] = useState(question.scaleMax ?? 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChoice = CHOICE_TYPES.has(type);
  const isScale = type === SCALE_TYPE;
  const getAccessToken = useFormAccessToken();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;

      const input: UpdateQuestionInput = {
        label: label.trim(),
        required,
        ...(isChoice && {
          options: options.filter((o) => o.trim()).map((o) => ({ label: o.trim() })),
        }),
        ...(isScale && { scaleMin, scaleMax }),
      };

      const updated = await updateQuestion(token, question.id, input);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-muted/40 p-4 space-y-4 ring-2 ring-ring/30"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`edit-q-label-${question.id}`}>Question</Label>
          <Input
            id={`edit-q-label-${question.id}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Question text"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`edit-q-type-${question.id}`}>Type</Label>
          <select
            id={`edit-q-type-${question.id}`}
            value={type}
            disabled
            className="flex h-8 w-full rounded-lg border border-input bg-muted px-2.5 text-sm opacity-80 cursor-not-allowed"
          >
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Type cannot be changed after creation.</p>
        </div>
      </div>

      {isChoice && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOptions([...options, ""])}
          >
            + Add option
          </Button>
        </div>
      )}

      {isScale && (
        <div className="flex items-end gap-4">
          <div className="space-y-1.5 w-24">
            <Label htmlFor={`edit-scale-min-${question.id}`}>Min</Label>
            <Input
              id={`edit-scale-min-${question.id}`}
              type="number"
              value={scaleMin}
              onChange={(e) => setScaleMin(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 w-24">
            <Label htmlFor={`edit-scale-max-${question.id}`}>Max</Label>
            <Input
              id={`edit-scale-max-${question.id}`}
              type="number"
              value={scaleMax}
              onChange={(e) => setScaleMax(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id={`edit-q-required-${question.id}`}
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor={`edit-q-required-${question.id}`} className="font-normal cursor-pointer">
          Required
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !label.trim()}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function storageUrl(storageKey: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${storageKey}`;
}

function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (file.type.startsWith("video/")) return "VIDEO";
  return null;
}

const MEDIA_LABEL: Record<MediaType, string> = {
  IMAGE: "Image",
  AUDIO: "Audio",
  VIDEO: "Video",
};

function QuestionCard({
  question,
  index,
  onMediaChange,
  onEdit,
  onDuplicate,
  onDeleteConfirm,
  duplicatePending,
}: {
  question: Question;
  index: number;
  onMediaChange: (questionId: string, media: BuilderMedia | null) => void;
  onEdit: () => void;
  onDuplicate: () => void | Promise<void>;
  onDeleteConfirm: () => void | Promise<void>;
  duplicatePending: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getAccessToken = useFormAccessToken();

  useEffect(() => {
    setDeleteStep(false);
    setDeleteError(null);
  }, [question.id]);

  async function handleDeleteClick() {
    if (!deleteStep) {
      setDeleteStep(true);
      setDeleteError(null);
      return;
    }
    try {
      await onDeleteConfirm();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete question"
      );
      setDeleteStep(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType = getMediaType(file);
    if (!mediaType) {
      setUploadError("Unsupported file type. Use image, audio, or video.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;

      const ext = file.name.split(".").pop() ?? "bin";
      const storageKey = `questions/${question.id}/${crypto.randomUUID()}.${ext}`;

      const supabase = createClient();
      const { error: storageError } = await supabase.storage
        .from("media")
        .upload(storageKey, file);
      if (storageError) throw new Error(storageError.message);

      const media = await attachMedia(token, question.id, {
        type: mediaType,
        storageKey,
        fileName: file.name,
        mimeType: file.type,
        durationSeconds: null,
      });

      onMediaChange(question.id, media);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveMedia() {
    if (!question.media) return;
    setUploading(true);
    setUploadError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;

      await removeMedia(token, question.id);

      // Best-effort storage cleanup — don't fail if this errors.
      const supabase = createClient();
      await supabase.storage.from("media").remove([question.media.storageKey]).catch(() => {});

      onMediaChange(question.id, null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to remove media.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug">{question.label}</p>
          {question.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {question.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={duplicatePending || uploading}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onDuplicate()}
              disabled={duplicatePending || uploading}
            >
              {duplicatePending ? "Duplicating…" : "Duplicate"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={deleteStep ? "destructive" : "outline"}
              onClick={() => void handleDeleteClick()}
              disabled={duplicatePending || uploading}
              className={deleteStep ? "whitespace-nowrap shrink-0" : "min-w-[2rem]"}
              aria-label={deleteStep ? "Confirm delete question" : "Delete question"}
            >
              {deleteStep ? "Are you sure?" : "✕"}
            </Button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge variant="secondary" className="text-xs">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
            {question.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
          </div>
        </div>
      </div>
      {deleteError && (
        <p className="text-xs text-destructive text-right">{deleteError}</p>
      )}

      {question.options.length > 0 && (
        <ul className="ml-6 space-y-0.5">
          {question.options.map((opt) => (
            <li key={opt.id} className="text-xs text-muted-foreground">
              · {opt.label}
            </li>
          ))}
        </ul>
      )}

      {question.type === "LINEAR_SCALE" && question.scaleMin !== null && (
        <p className="ml-6 text-xs text-muted-foreground">
          Scale: {question.scaleMin} – {question.scaleMax}
        </p>
      )}

      {/* Media section */}
      <div className="ml-6 pt-1">
        {question.media ? (
          <div className="space-y-1.5">
            {question.media.type === "IMAGE" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storageUrl(question.media.storageKey)}
                alt={question.media.fileName}
                className="max-h-32 rounded border object-cover"
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {MEDIA_LABEL[question.media.type]}: {question.media.fileName}
              </span>
              <button
                type="button"
                onClick={handleRemoveMedia}
                disabled={uploading}
                suppressHydrationWarning
                className="text-xs text-destructive hover:underline disabled:opacity-50"
              >
                {uploading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              suppressHydrationWarning
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "+ Attach media"}
            </button>
          </>
        )}
        {uploadError && (
          <p className="text-xs text-destructive mt-1">{uploadError}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Form Builder ─────────────────────────────────────────────────────────

export function FormBuilder({ initialForm }: { initialForm: Form }) {
  const [form, setForm] = useState<Form>(initialForm);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [duplicatePendingId, setDuplicatePendingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null;
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  const getAccessToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const t = session?.access_token ?? null;
    tokenRef.current = t;
    return t;
  }, []);

  // Use the first section for new questions (default section always exists).
  const firstSection = form.sections[0];
  const allQuestions = form.sections.flatMap((s) => s.questions);

  const publicPath = `/f/${form.publicId}`;
  const siteBase =
    typeof process.env.NEXT_PUBLIC_SITE_URL === "string"
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : "";
  // Same string on server and client — never branch on `window` for render.
  const publicUrl = siteBase ? `${siteBase}${publicPath}` : publicPath;

  function handleQuestionAdded(question: Question) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === firstSection.id
          ? { ...s, questions: [...s.questions, question] }
          : s
      ),
    }));
    setAddingQuestion(false);
  }

  const handleQuestionUpdated = useCallback((updated: Question) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => (q.id === updated.id ? updated : q)),
      })),
    }));
    setEditingQuestionId(null);
  }, []);

  const handleDeleteQuestion = useCallback(
    async (questionId: string) => {
      const token = await getAccessToken();
      if (!token) return;
      await deleteQuestion(token, questionId);
      setForm((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId),
        })),
      }));
    },
    [getAccessToken]
  );

  const handleDuplicateQuestion = useCallback(
    async (questionId: string) => {
      setDuplicatePendingId(questionId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await duplicateQuestion(token, questionId);
        const refreshed = await getForm(token, form.id);
        setForm(refreshed);
      } finally {
        setDuplicatePendingId(null);
      }
    },
    [form.id, getAccessToken]
  );

  function handleMediaChange(questionId: string, media: BuilderMedia | null) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) =>
          q.id === questionId ? { ...q, media } : q
        ),
      })),
    }));
  }

  async function handlePublishToggle() {
    setPublishing(true);
    setPublishError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;

      if (form.isPublished) {
        const updated = await unpublishForm(token, form.id);
        setForm((prev) => ({ ...prev, ...updated }));
      } else {
        const updated = await publishForm(token, form.id);
        setForm((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Failed to update publish state"
      );
    } finally {
      setPublishing(false);
    }
  }

  function handleCopyLink() {
    const toCopy = siteBase
      ? publicUrl
      : `${window.location.origin}${publicPath}`;
    navigator.clipboard.writeText(toCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <FormAccessTokenContext.Provider value={getAccessToken}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold truncate">{form.title}</h1>
            <Badge variant={form.isPublished ? "default" : "secondary"}>
              {form.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          {form.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {form.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard" suppressHydrationWarning>
              ← Back
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/dashboard/forms/${form.id}/analytics`}
              suppressHydrationWarning
            >
              Analytics
            </Link>
          </Button>
          <Button
            size="sm"
            variant={form.isPublished ? "outline" : "default"}
            onClick={handlePublishToggle}
            disabled={publishing}
          >
            {publishing
              ? "…"
              : form.isPublished
              ? "Unpublish"
              : "Publish"}
          </Button>
        </div>
      </div>

      {publishError && (
        <p className="text-sm text-destructive">{publishError}</p>
      )}

      {/* Public link */}
      {form.isPublished && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {publicUrl}
          </span>
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
            >
              Open ↗
            </a>
          </Button>
        </div>
      )}

      <Separator />

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Questions{" "}
            <span className="text-muted-foreground font-normal">
              ({allQuestions.length})
            </span>
          </h2>
        </div>

        {allQuestions.length === 0 && !addingQuestion && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No questions yet. Add your first question below.
            </p>
          </div>
        )}

        {allQuestions.map((q, i) =>
          editingQuestionId === q.id ? (
            <EditQuestionForm
              key={q.id}
              question={q}
              onSaved={handleQuestionUpdated}
              onCancel={() => setEditingQuestionId(null)}
            />
          ) : (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              onMediaChange={handleMediaChange}
              onEdit={() => {
                setAddingQuestion(false);
                setEditingQuestionId(q.id);
              }}
              onDuplicate={() => handleDuplicateQuestion(q.id)}
              onDeleteConfirm={() => handleDeleteQuestion(q.id)}
              duplicatePending={duplicatePendingId === q.id}
            />
          )
        )}

        {addingQuestion && firstSection ? (
          <AddQuestionForm
            formId={form.id}
            sectionId={firstSection.id}
            onAdded={handleQuestionAdded}
            onCancel={() => setAddingQuestion(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditingQuestionId(null);
              setAddingQuestion(true);
            }}
          >
            + Add question
          </Button>
        )}
      </div>
    </div>
    </FormAccessTokenContext.Provider>
  );
}
