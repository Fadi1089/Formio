# apps/api

Express + TypeScript backend for Formio. Handles all creator-authenticated endpoints and public responder endpoints. Uses Prisma as the ORM against a PostgreSQL database hosted on Supabase.

## Responsibilities

- Private creator endpoints (auth-protected): form CRUD, sections, questions, audio metadata, publish/unpublish, analytics
- Public endpoints (no auth): fetch published form by public ID, submit a response

## Environment variables

Copy `.env.example` to `.env` and fill in your values.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled Supabase Postgres URL (used at runtime) |
| `DIRECT_URL` | Direct (non-pooled) Supabase Postgres URL (used for migrations) |
| `PORT` | Port the API listens on (default: `3001`) |

## Running locally

```bash
# Install dependencies (from repo root)
pnpm install

# Start development server with hot reload
pnpm dev

# Or from repo root
pnpm dev:api
```

The API starts at `http://localhost:3001`. Verify with:

```bash
curl http://localhost:3001/health
# {"ok":true}
```

## Database migrations

```bash
# Create and apply a new migration
pnpm prisma migrate dev --name <migration-name>

# Apply existing migrations (e.g. after pulling changes)
pnpm prisma migrate deploy

# Open Prisma Studio to inspect data
pnpm prisma studio
```

## Build

```bash
pnpm build   # compiles TypeScript to dist/
pnpm start   # runs compiled output
```
