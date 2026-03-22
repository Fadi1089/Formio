# Formio

A Google Forms-like platform with audio clip support for questions.

## What it does

- **Creators** sign in with Google, build forms with sections and questions, attach audio clips, publish forms, and view response analytics.
- **Responders** open a shared public link, fill out the form without logging in, and submit.

## Monorepo structure

```
/
  apps/
    api/   — Express + TypeScript backend, Prisma ORM, PostgreSQL via Supabase
    web/   — Next.js frontend with shadcn/ui
  docs/
    PROJECT_SPEC.md
```

## Local setup

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A Supabase project (for Postgres, Auth, and Storage)

### Install dependencies

```bash
pnpm install
```

### Configure environment

Copy the example env files and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

See each app's README for the full list of required variables.

### Run locally

In separate terminals:

```bash
# Terminal 1 — API (http://localhost:3001)
pnpm dev:api

# Terminal 2 — Web (http://localhost:3000)
pnpm dev:web
```

Or from each app's directory:

```bash
cd apps/api && pnpm dev
cd apps/web && pnpm dev
```

### Database migrations

```bash
cd apps/api
pnpm prisma migrate dev
```

## Apps

| App | README |
|---|---|
| `apps/api` | [apps/api/README.md](apps/api/README.md) |
| `apps/web` | [apps/web/README.md](apps/web/README.md) |
