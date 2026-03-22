# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

A Google Forms-like web platform with audio clip support for questions. Two distinct experiences:
- **Creator** (authenticated via email/password): builds, publishes, and analyzes forms
- **Responder** (unauthenticated public): opens shared forms and submits responses

## Monorepo Structure

```
/
  README.md
  docs/PROJECT_SPEC.md   ← authoritative spec, read this first
  apps/
    api/                 ← backend service (Node.js + Prisma + PostgreSQL)
    web/                 ← frontend (Next.js + shadcn/ui)
```

Each app has its own `.env` file. Never mix backend-only secrets into the web env.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js |
| UI | shadcn/ui (default theme) |
| Backend | Separate API service in `apps/api` |
| ORM | Prisma (source of truth for DB schema) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (audio files) |
| Hosting | Vercel (web) |

## Commands

> The project is in the specification phase. Commands will be added here once `apps/api` and `apps/web` are scaffolded. Refer to each app's README for its specific run/migrate/test instructions.

Expected commands once implemented:
- `apps/api`: install deps, run migrations (`prisma migrate dev`), start API server
- `apps/web`: install deps, start dev server (`next dev`)

## Architecture Principles

### API
- Prisma schema is the single source of truth for the DB.
- Two clearly separated route categories:
  - **Private** (authenticated creators): form CRUD, sections/questions, audio metadata, publish/unpublish, analytics
  - **Public** (unauthenticated): fetch published form by public ID, submit response
- Public endpoints expose only what is needed for published forms.
- Enforce ownership rules server-side — never trust the client to write directly.

### Frontend
- shadcn/ui default style; keep UI clean and minimal.
- Creator routes are protected; public responder routes are open.
- Public form response flow must be frictionless (no login required).

### Data Model (Prisma)
Design models for: creator user, form, form section, question, question options, question audio attachment, published/public access metadata, response submission, per-question answer. Schema must be analytics-friendly from the start.

## Implementation Phases

Follow this order (from `docs/PROJECT_SPEC.md`):
1. Monorepo scaffold + READMEs + env examples
2. Prisma schema
3. API contract (route definitions)
4. API implementation (CRUD, publish, public fetch, submission)
5. Web shell (landing, email/password sign-in, creator dashboard)
6. Form builder UI (sections, questions, audio attach, publish)
7. Public response flow (render, audio playback, submit)
8. Analytics (counts, timelines, distributions, text listings)
9. Cleanup and documentation

## MVP Boundaries

**In scope:** audio-enabled questions, email/password auth, public no-auth response, creator analytics, publish/unpublish, question types: short text, long text, single choice, multiple choice, linear scale, dropdown, date, time.

**Explicitly out of scope:** billing, teams, branching/conditional logic, respondent accounts, AI-generated forms, collaborative editing, advanced theming, file upload answers, email campaigns.

## Key Constraints

- Creators authenticate with email/password via Supabase Auth.
- Only published forms are accessible publicly.
- Analytics visible to form owner only.
- Audio stored in Supabase Storage; playable inline in the public form.
- When an implementation choice is ambiguous, choose the simpler solution that still respects `docs/PROJECT_SPEC.md`.
