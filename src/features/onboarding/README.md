# features/onboarding

The Memoir Project's onboarding flow: pledge → name → relationship → years → deep question →
signup → pricing → payment → dashboard → chapter review → publish.

Ported from the `memoir-onboarding_7.html` prototype, preserving its visual design (serif/ivory
look, Spectral + Inter) and behaviour as closely as React allows.

## How this feature is wired

The pledge screen through to the invite link on the dashboard is connected to the real backend.
Screens after the dashboard (pricing, payment, working, review, confirm, published) are still
client-only prototypes — there are no tables or endpoints behind them yet.

| Screen | What it does |
| --- | --- |
| `landing` | `POST /drafts` on pledge, creating the anonymous draft. Not on page load, so a visitor who never starts leaves no row behind. |
| `name` / `rel` / `years` / `deep` | `PATCH /drafts/{id}` per step, best-effort and not awaited. |
| `signup` | Supabase Auth signup/sign-in, then `POST /memoirs/claim`. Awaited — the flow does not advance until the memoir exists. |
| `dash` | Renders the real `link_token`, from the claim response or `GET /me` after a reload. |
| `pricing` → `published` | Unchanged prototype. No billing, chapters or publishing exists. |

There is no `queries.ts` / `server.ts`: before signup the only credential is the draft token in
the browser's localStorage, so nothing here can be fetched during server rendering. Contrast
`features/invitation/`, which is server-rendered precisely because `GET /j/{token}` needs no auth.

### The two credentials

They are not interchangeable, and `POST /memoirs/claim` needs both:

- `X-Draft-Token` proves *this browser* started the draft. Before signup it is the only credential
  that exists.
- `Authorization: Bearer` proves *who the user is*, once Supabase has issued a token.

Without the draft token, any signed-in user who learned a draft id could claim someone else's
answers.

### Why answers are re-sent at signup

The per-step saves are fired, not awaited, so a slow request never makes the next question feel
sluggish. That means one can be lost. `claim()` therefore `PATCH`es the complete answer set
immediately before claiming, so the row is correct regardless of which intermediate saves landed.

### The years wheel

Three UI facts collapse into two columns, which is why `subject_is_living` is nullable:

| The user did | `subject_is_living` | `through_year` |
| --- | --- | --- |
| picked "Present" | `true` | `null` |
| picked a year | `false` | that year |
| never touched it | `null` | `null` |

"We didn't ask" and "no, they have died" are different answers. Defaulting the first to `false`
would record something the user never said.

## Files

| File | Purpose |
| --- | --- |
| `schemas.ts` | Zod contract — the twin of the backend's `draft_models.py` and `memoir_models.py`. |
| `api.ts` | The four endpoint calls. The only file that knows the paths. |
| `hooks.ts` | TanStack Query mutations, `useMe()`, and `toDraftUpdate()` (UI state → column names). |
| `draftStorage.ts` | The draft id/token in localStorage, exposed as a React external store. |
| `types.ts` | `Step` union and the `OnboardingState` shape carried across the flow. |
| `data.ts` | Static content: relationship chips, chapters, plans, features list, background photos. |
| `utils.ts` | Pure string helpers (`firstName`, `possessive`, `slugifyName`). |
| `useTransientLabel.ts` | Shared "flash to X, then revert" state for the copy-link / fake-share buttons. |
| `onboarding.module.css` | The prototype's stylesheet, scoped to `.shell` instead of `:root`/`body`. |
| `components/OnboardingFlow.tsx` | The orchestrator — owns `step` and `OnboardingState`, renders the active step. |
| `components/*Step.tsx` | One component per screen. |
| `components/BackgroundLayer.tsx` | The crossfading full-bleed background photo behind each step. |
| `components/BookCover.tsx` | The generated book-cover mockup shown at signup, pricing, and published. |
| `components/YearWheel.tsx` | The scroll-snap year picker used by `YearsStep`. |

## Notes

- `public/Images/` holds the background photos, referenced by path in `data.ts`
  (`STEP_BACKGROUND`). The `signup` step has no matching photo in that folder, so it renders with
  no background — same fallback the original prototype used for a missing key.
- `.mode`/`.modes`, `.plate*`, `.does`/`.doe*`, `.keep`, and the generic `.price*` rules from the
  prototype's CSS were dead (no markup referenced them) and were dropped rather than ported.
- Fonts (Spectral, Inter) are loaded via `next/font/google` in `app/onboarding/page.tsx`, scoped to
  this route rather than the root layout — the rest of the app uses Geist.
