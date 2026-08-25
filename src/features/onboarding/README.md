# features/onboarding

The Memoir Project's onboarding flow: pledge → name → relationship → years → deep question →
signup → pricing → payment → dashboard → chapter review → publish.

Ported from the `memoir-onboarding_7.html` prototype, preserving its visual design (serif/ivory
look, Spectral + Inter) and behaviour as closely as React allows.

## Why this feature looks different from `example/`

There is no backend endpoint for onboarding yet — every screen after the pledge uses fake,
client-only data (mock payment, mock invite link, mock publish). That means this feature has none
of the usual layers:

- No `schemas.ts` / `api.ts` — nothing is sent to or received from the backend.
- No `queries.ts` / `server.ts` — no server-fetched data, so no `server-only` boundary is needed.
- No `hooks.ts` — no TanStack Query mutations; all state is local `useState` in
  `components/OnboardingFlow.tsx`.

When a real backend endpoint exists for any part of this flow (saving a draft, creating an
account, generating an invite link), add `schemas.ts` and `api.ts` and wire the relevant step to
them, following the pattern in `features/example/`.

## Files

| File | Purpose |
| --- | --- |
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
