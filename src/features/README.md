# src/features

The frontend twin of the backend's `src/domain/`. One folder per feature, containing everything
that feature needs. **Deleting the folder should delete the feature completely.**

Copy `example/` to start a new one.

## The features that exist

| Feature | Who it serves | Data path |
| --- | --- | --- |
| `onboarding/` | A visitor with no account yet, up to signup | client |
| `account/` | The signed-in user: `GET /me`, and which memoir a screen is about | client |
| `archive/` | The owner: their memories, and adding more | client |
| `contributors/` | The owner: who is in the memoir, and the share link | client |
| `billing/` | The owner: their plan and storage meter | client |
| `media/` | Both owner and contributor: getting a file into storage | client |
| `invitation/` | A contributor, who has no account and never will | **both** |
| `example/` | Nobody — reference scaffolding, kept as the pattern to copy | both |

`invitation/` is the only one with a server data path, because `GET /j/{token}`
is the only endpoint that needs no credential. Everything else is authenticated
with a Supabase token held in the browser, which a server render cannot reach.

The dependency direction worth preserving: `archive`, `contributors` and
`billing` all read `account`; `archive` and `invitation` both use `media`.
Nothing depends on `onboarding` — it is where an account begins, not something
the rest of the app consults.

## What a feature folder holds

```
features/<name>/
  schemas.ts       # Zod contract — twin of the backend's Pydantic models
  api.ts           # One function per endpoint. The only place a path is written.
  queries.ts       # SERVER data path (imports `server-only`)
  hooks.ts         # CLIENT data path (TanStack Query)
  index.ts         # Public surface, client-safe
  server.ts        # Public surface, server-only (only if queries.ts exists)
  components/      # Components that know about this feature
```

Add subfolders as the feature grows — `utils.ts`, `constants.ts`, a nested `components/` tree. The
backend does the same thing inside `domain/<feature>/`.

## Rules

- **Pick a data path.** Default to `queries.ts` (server). Add `hooks.ts` only when the data changes
  in response to the user: mutations, polling, refetch, optimistic updates. Many features need
  both — `example` shows both against one endpoint.
- **Never call `fetch` here.** `api.ts` calls `apiRequest` from `lib/api/client.ts`, which owns the
  base URL, timeouts, error normalization, and response validation.
- **Never deep-import another feature.** Import from its `index.ts` or `server.ts`, never from a
  file inside it. If two features need the same thing, it belongs in `lib/` or `components/ui/`.
- **Keep `server.ts` and `index.ts` separate.** `queries.ts` imports `server-only`, so re-exporting
  it from `index.ts` breaks the build for any client component that touches the barrel — even one
  that only wanted a type.

## Where things go

| You have… | It goes in… |
| --- | --- |
| A shape the backend sends or receives | `schemas.ts` |
| A new endpoint call | `api.ts` |
| A component only this feature uses | `<feature>/components/` |
| A component two features use | `src/components/` |
| A helper only this feature uses | `<feature>/utils.ts` |
| A pure helper two features use | `src/utils/` |
| A React hook two features use, with no domain knowledge | `src/hooks/` |
| App-wide infrastructure: a client, config, a provider | `src/lib/` |
