# src/components

Components shared across features. **Nothing here knows about your domain.**

The test: if a component's props mention a greeting, a user, or an order, it is not a shared
component — it belongs in `src/features/<feature>/components/`.

## Structure

```
components/
  ui/          # shadcn primitives — Button, Card, Input, Label, Textarea,
               #   Separator, Meter
  layout/      # the app shell — header, footer, page header, session guard
```

`ui/` is generated and updated by the shadcn CLI:

```bash
npx shadcn@latest add <component>
```

Prefer adding a primitive with the CLI over hand-writing one. Editing files in `ui/` is fine — the
CLI copies them into your repo precisely so you can — but expect to re-apply changes if you ever
re-add that component.

Note: this project's shadcn build uses [Base UI](https://base-ui.com), not Radix. Primitives take a
`render` prop rather than `asChild`. To style a link as a button, apply `buttonVariants()` to the
link instead of nesting it inside `<Button>`.

## layout/

The chrome every signed-in screen shares, used by `src/app/(app)/layout.tsx`:

| File | What it is |
| --- | --- |
| `AppHeader.tsx` | Wordmark, the four nav destinations, sign-out avatar. Client — it needs `usePathname` and the session. |
| `AppFooter.tsx` | The closing line. Server component. |
| `PageHeader.tsx` | Eyebrow → serif title → description → rule. Every screen opens with it. |
| `RequireSession.tsx` | Sends signed-out visitors to `/onboarding`. A convenience, **not** a security boundary — the backend is. |
| `Wordmark.tsx` | The mark and the name. Takes an optional `href` so the contributor screens can render it unlinked. |

These are flat files rather than folders because each is a small presentational
shell with no logic worth testing in isolation. The folder-per-component layout
below is still the right shape for anything that grows a test.

## Adding your own shared components

Create sibling folders as the need appears — `forms/` for field wrappers, and so on. Put each
non-trivial component in its own folder with its test:

```
components/layout/Sidebar/
  Sidebar.tsx
  Sidebar.test.tsx
  index.ts
```

Do not create these folders speculatively. A component belongs here once a **second** feature needs
it — until then it lives in the feature that uses it.
