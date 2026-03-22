# apps/web

Next.js frontend for Formio. Uses shadcn/ui (default theme) and calls `apps/api` for all data. Hosted on Vercel.

## Responsibilities

- Landing page and Google sign-in entry point (via Supabase Auth)
- Creator dashboard: build and manage forms, attach audio, publish/unpublish, view analytics
- Public responder pages: render published forms, support audio playback, submit responses without login

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API (e.g. `http://localhost:3001` locally) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (safe for the browser) |

All variables are prefixed with `NEXT_PUBLIC_` — no backend-only secrets belong here.

## Running locally

```bash
# Install dependencies (from repo root)
pnpm install

# Start development server
pnpm dev

# Or from repo root
pnpm dev:web
```

The web app starts at `http://localhost:3000`.

## How it interacts with the API

- All data fetching goes through `NEXT_PUBLIC_API_URL` (the `apps/api` service).
- Auth is handled via Supabase Auth; the resulting session token is sent as a Bearer token on creator requests.
- Public responder pages call the unauthenticated API endpoints — no session required.

## Build

```bash
pnpm build   # production build
pnpm start   # serve production build
```
