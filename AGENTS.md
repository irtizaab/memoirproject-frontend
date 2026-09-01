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

- **Only two people can write to a memoir**, and they prove it differently: the owner with a
  Supabase bearer token, a contributor with the token from the link they were sent. Anything that
  assumes a contributor has an account is a product bug — they never create one.
- **A memoir that is not yours answers 404, never 403.** The backend never confirms a stranger's
  memoir exists, and the frontend should not present the difference either.

Run `npm run verify` (typecheck + lint + test) before considering work complete.

## The shape of the app

```
/onboarding      no account yet — its own chrome, no nav
                 ends by pushing to /archive; nothing else follows it
/archive         the owner's memories, as summaries    ┐
/archive/[id]    one memory in full                    │
/archive/new     the composer                          │ (app) route group:
/contributors    who is in it, and the share link     │ header, footer, session
/billing         plan and storage meter               ┘ guard
/j/[token]       a contributor — its own chrome, server-rendered
```

`src/app/(app)/` is a route group: parenthesised, so it adds a layout without adding a URL
segment. `/onboarding` and `/j/[token]` sit outside it on purpose — one is reached before an
account exists, the other by someone who will never have one.

**Onboarding ends at `/archive`.** It used to end at five mock screens — a fake dashboard, a fake
AI-drafting spinner, hardcoded chapters, a fake publish — while the real app was reachable by
nothing. Those are deleted (commit `f11ddbc` if the design is wanted back). The pay step calls
`router.push("/archive")`, not `window.location`, so the query cache the claim just seeded survives
and the archive mounts already holding the memoir.

**One price, one source.** `GET /plans` is public and both onboarding's pricing step and `/billing`
read it, through `features/billing`. Do not add a price constant anywhere: onboarding used to keep
one saying $3/month while the database said $8, and nothing made them agree.

**One account, one memoir.** Enforced by `memoir_one_per_account` in migration 0007, because
`useActiveMemoir` shows `memoirs[0]` and a second memoir silently hid the first one's memories.
`POST /memoirs/claim` answers 409 when an account already has one; `SignupStep` catches that and
links to the archive rather than showing an error.

**The grid summarises; the memory page shows.** A card carries one image, a count of what is
inside, and an excerpt — it is a `<Link>`, so middle-click and open-in-new-tab work. Everything else
(every photograph, a player and transcript per recording, the full text, **and delete**) lives at
`/archive/[memoryId]`. Delete moved there deliberately: it destroys somebody's recording of
somebody's grandmother and should not be reachable by mis-tapping a tile while scrolling.

**The subject headlines the archive**, never the account owner — `archiveTitle()`. It is their
memoir; the person reading is its keeper.

**Signing out must clear the query cache.** `AppHeader.signOut` calls `queryClient.clear()`. Without
it, `GET /me` stays cached with a memoir in it, onboarding's landing guard sees one, redirects to
`/archive`, `RequireSession` finds no session and redirects back — an infinite loop that looked like
the app hanging. The guard now also requires a live session, as a second wall.

**A memory is not one thing.** Writing, photographs and recordings go in together — the three
tiles in the composer are *toggles*, not a choice, and all three can be lit. Both the owner's
`MemoryComposer` and the contributor's `ContributeForm` share `useAttachments()` from
`features/media`, because they ask a person for the same things and two copies of that state is how
one of them grows a bug the other has not. **Turning a tile off discards what was in it** and
revokes its object URLs — anything else uploads a recording the person believes they removed.

Do not send `kind`. The backend derives it from what the memory holds; the request schemas have no
such field, and the response schema still does.

**Transcripts arrive by polling, and the polling stops by itself.** Every voice note is transcribed
automatically by the backend. `useMemories` and `useMyContributions` set `refetchInterval` from
`hasPendingTranscript()` — five seconds while a recording is still being written out, `false`
otherwise — so an archive of photographs, or one whose transcripts have all landed, never refetches.
Render with `TranscriptReader` from `features/media`. It is a `<details>` disclosure, **closed by
default** — a memoir with twenty recordings would otherwise be a grid of enormous cards. It shows a
quiet line while processing, says so plainly when a recording was `skipped` for budget, and renders
**nothing at all** on failure, because a family cannot act on a provider's error and the audio is
unaffected.
