<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

This repo is a **template**. Its structure is the deliverable, so keep new code consistent with it.
The root `README.md` has the full rationale and **every directory under `src/` has its own
`README.md`** describing what belongs in it — read the one for the directory you are editing, and
update it when you change what that directory holds. The short version:

- `src/app/` is thin. Pages compose features. No `fetch`, no business logic.
- A feature is one folder under `src/features/<name>/`, containing `schemas.ts` (Zod contract),
  `api.ts` (endpoint calls), a data path (`queries.ts` for server, `hooks.ts` for client),
  `index.ts` (client-safe exports), and `server.ts` (server-only exports, if `queries.ts` exists).
- **Only `src/lib/api/client.ts` calls `fetch`.** Everything else goes through `apiRequest`.
- Never deep-import another feature's internals — use its `index.ts` or `server.ts`.
- `src/components/ui/` holds shadcn primitives with no domain knowledge. Feature-aware components
  live in the feature folder. `src/components/layout/` holds the app shell used by `app/(app)/`.
- **The theme lives in `src/app/globals.css` and nowhere else.** Paper, ink, seal red, the hairline
  rule colour, the two typefaces, and the 4px radius are declared there once, under both the memoir
  names (`--paper`, `--seal`) and the shadcn names (`--background`, `--primary`) that the primitives
  consume. Never hard-code a hex value in a component or re-declare the palette in a CSS module —
  `features/onboarding/onboarding.module.css` used to, and the two halves of the product drifted
  apart until it stopped. There is no dark mode, deliberately.
- Buttons and labels are **sentence case**. The tracked-out uppercase is reserved for the eyebrow
  above a page title (`.eyebrow`) and for quiet metadata (`.eyebrow-muted`), both defined in
  `globals.css`.
- `src/utils/` is pure generic functions, `src/hooks/` is generic React hooks, `src/lib/` is
  infrastructure (dependencies, config, I/O). Add a file to either only when a **second** caller
  needs it — `utils/` is still empty on those grounds, and `hooks/` holds exactly one.
  Data-fetching hooks belong in `features/<name>/hooks.ts`, never in `src/hooks/`.
- Default to fetching on the server. Use TanStack Query only when data changes in response to the
  user (mutations, polling, refetch).
- Every API response is validated by a Zod schema at the boundary. No unvalidated data enters the app.
- Forms use React Hook Form with `zodResolver` and the feature's existing request schema. Never
  write validation rules or error messages in a component — they belong in `schemas.ts`.
- `queries.ts` imports `server-only`; do not re-export it from a client-reachable barrel.
- Do not wrap `fetch` in a `try/catch` without calling `unstable_rethrow(error)` first — Next.js
  signals control flow by throwing, and swallowing it breaks the production build silently.

Run `npm run verify` (typecheck + lint + test) before considering work complete.
