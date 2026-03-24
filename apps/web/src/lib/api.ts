const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const devTiming = process.env.NODE_ENV === "development";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "LINEAR_SCALE"
  | "DROPDOWN"
  | "DATE"
  | "TIME";

export type MediaType = "AUDIO" | "IMAGE" | "VIDEO";

export interface QuestionOption {
  id: string;
  label: string;
  order: number;
}

// Media as returned by the builder API (Prisma object — has storageKey, no url).
export interface BuilderMedia {
  id: string;
  type: MediaType;
  storageKey: string;
  fileName: string;
  mimeType: string;
  durationSeconds: number | null;
}

// Media as returned by the public API (storageKey is replaced with a public url).
export interface MediaAttachment {
  type: MediaType;
  url: string;
  fileName: string;
  mimeType: string;
  durationSeconds: number | null;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  description: string | null;
  required: boolean;
  order: number;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  options: QuestionOption[];
  media: BuilderMedia | null;
}

// Question shape as returned by the public endpoint (media has url, not storageKey).
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description: string | null;
  required: boolean;
  order: number;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  options: QuestionOption[];
  media: MediaAttachment | null;
}

export interface Section {
  id: string;
  title: string | null;
  order: number;
  questions: Question[];
}

export interface Form {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  publicId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
}

export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  publicId: string;
  createdAt: string;
  updatedAt: string;
  _count: { responses: number };
}

export interface PublicForm {
  publicId: string;
  title: string;
  description: string | null;
  sections: Array<{
    id: string;
    title: string | null;
    order: number;
    questions: Array<PublicQuestion>;
  }>;
}

export interface QuestionAnalytics {
  questionId: string;
  label: string;
  type: QuestionType;
  totalAnswers: number;
  distribution?: { optionId: string; label: string; count: number; percentage: number }[];
  average?: number | null;
  scaleCounts?: { value: number; count: number }[];
  textResponses?: string[];
}

export interface Analytics {
  formId: string;
  totalResponses: number;
  timeline: { date: string; count: number }[];
  questions: QuestionAnalytics[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function authFetch<T>(
  token: string,
  path: string,
  options?: RequestInit
): Promise<T> {
  const t0 = devTiming ? performance.now() : 0;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (devTiming) {
    console.debug(`[web] ${options?.method ?? "GET"} ${path} ${(performance.now() - t0).toFixed(1)}ms`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const t0 = devTiming ? performance.now() : 0;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (devTiming) {
    console.debug(`[web] ${options?.method ?? "GET"} ${path} ${(performance.now() - t0).toFixed(1)}ms`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function upsertCreator(
  token: string,
  data: { email: string; name?: string | null; avatarUrl?: string | null }
) {
  return authFetch<Creator>(token, "/api/v1/auth/me", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCreator(token: string) {
  return authFetch<Creator>(token, "/api/v1/auth/me");
}

// ── Forms ─────────────────────────────────────────────────────────────────────

export function getForms(token: string) {
  return authFetch<{ forms: FormSummary[] }>(token, "/api/v1/forms");
}

export function createForm(
  token: string,
  data: { title: string; description?: string | null }
) {
  return authFetch<Form>(token, "/api/v1/forms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getForm(token: string, formId: string) {
  return authFetch<Form>(token, `/api/v1/forms/${formId}`);
}

export function updateForm(
  token: string,
  formId: string,
  data: { title?: string; description?: string | null }
) {
  return authFetch<Pick<Form, "id" | "title" | "description" | "updatedAt">>(
    token,
    `/api/v1/forms/${formId}`,
    { method: "PATCH", body: JSON.stringify(data) }
  );
}

export function publishForm(token: string, formId: string) {
  return authFetch<Pick<Form, "id" | "isPublished" | "publicId" | "publishedAt">>(
    token,
    `/api/v1/forms/${formId}/publish`,
    { method: "POST" }
  );
}

export function unpublishForm(token: string, formId: string) {
  return authFetch<Pick<Form, "id" | "isPublished">>(
    token,
    `/api/v1/forms/${formId}/unpublish`,
    { method: "POST" }
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

export function createSection(token: string, formId: string, data?: { title?: string }) {
  return authFetch<Section>(token, `/api/v1/forms/${formId}/sections`, {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  });
}

// ── Questions ─────────────────────────────────────────────────────────────────

export interface CreateQuestionInput {
  type: QuestionType;
  label: string;
  description?: string | null;
  required?: boolean;
  scaleMin?: number | null;
  scaleMax?: number | null;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  options?: { label: string }[];
}

export function createQuestion(
  token: string,
  formId: string,
  sectionId: string,
  data: CreateQuestionInput
) {
  return authFetch<Question>(
    token,
    `/api/v1/forms/${formId}/sections/${sectionId}/questions`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export type UpdateQuestionInput = {
  label?: string;
  description?: string | null;
  required?: boolean;
  scaleMin?: number | null;
  scaleMax?: number | null;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  options?: { label: string }[];
};

export function updateQuestion(
  token: string,
  questionId: string,
  data: UpdateQuestionInput
) {
  return authFetch<Question>(token, `/api/v1/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteQuestion(token: string, questionId: string) {
  return authFetch<{ ok: true }>(token, `/api/v1/questions/${questionId}`, {
    method: "DELETE",
  });
}

export function duplicateQuestion(token: string, questionId: string) {
  return authFetch<Question>(token, `/api/v1/questions/${questionId}/duplicate`, {
    method: "POST",
  });
}

export function attachMedia(
  token: string,
  questionId: string,
  data: {
    type: MediaType;
    storageKey: string;
    fileName: string;
    mimeType: string;
    durationSeconds?: number | null;
  }
) {
  return authFetch<BuilderMedia>(token, `/api/v1/questions/${questionId}/media`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeMedia(token: string, questionId: string) {
  return authFetch<{ ok: true }>(token, `/api/v1/questions/${questionId}/media`, {
    method: "DELETE",
  });
}

export function addOption(token: string, questionId: string, label: string) {
  return authFetch<QuestionOption>(token, `/api/v1/questions/${questionId}/options`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

// ── Public ────────────────────────────────────────────────────────────────────

export function getPublicForm(publicId: string) {
  return publicFetch<PublicForm>(`/api/v1/public/forms/${publicId}`);
}

export function submitResponse(
  publicId: string,
  answers: Array<{ questionId: string; value?: string | null; optionIds?: string[] }>
) {
  return publicFetch<{ responseId: string; submittedAt: string }>(
    `/api/v1/public/forms/${publicId}/responses`,
    { method: "POST", body: JSON.stringify({ answers }) }
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function getAnalytics(token: string, formId: string) {
  return authFetch<Analytics>(token, `/api/v1/forms/${formId}/analytics`);
}
