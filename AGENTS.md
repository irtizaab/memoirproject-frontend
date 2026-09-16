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
  rule colour, the two typefaces, the radius and the one shadow are declared there once, under both
  the memoir names (`--paper`, `--seal`) and the shadcn names (`--background`, `--primary`) that the
  primitives consume. Never hard-code a hex value in a component or re-declare the palette in a CSS
  module — `features/onboarding/onboarding.module.css` used to, and the two halves of the product
  drifted apart until it stopped. **Dark mode is ten re-picked values in that same file** and
  nothing else — the shadcn contract is written in terms of the memoir names, so
  redefining the names redefines every primitive. Never add a `dark:` utility to a
  component; if something needs a dark value it needs a token.

  Two of the ten are worth knowing. `--paper-raised` is the card surface and is **lighter than the
  ground in both modes**: dark forced the point first (a raised surface darker than its ground reads
  as a hole) and light used to get away with the opposite only because the page was white. And
  `--seal` lifts to `#cf6a60` in dark because `#7c1015` on a near-black ground measures 1.71:1 and
  is unreadable as text. `--lift` is the one shadow; a card invented with its own elevation is how
  eight cards end up with six.

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
/                the landing page — what this is, and the way in
/signin          the way back in, for an account that already exists
/onboarding      no account yet — its own chrome, no nav
                 ends by pushing to /archive; nothing else follows it
/archive         the owner's memories, as summaries    ┐
/archive/[id]    one memory in full                    │
/archive/new     the composer                          │ (app) route group:
/questions       what the family is asked before they  │ header, footer,
                 write, and who decides it             │
/contributors    who is in it, and the share link      │
/billing         plan and storage meter                │ session guard
/search          the whole memoir, searched            ┘
/j/[token]       a contributor — its own chrome, server-rendered
/m/[token]       the finished memoir, opened by a view link AND a passphrase —
                 its own chrome, server-rendered, four columns wide. The
                 whole book on one page; `#{chapterId}`, `#people`,
                 `#colophon` scroll to a part. `/m/[token]/[page]` redirects
                 an old per-chapter address to the same anchor
/m/[token]/search  the same search, from inside the book
/preview/[id]/…  the same book, read by its owner before sealing it —
                 signed-in, client-fetched, and the one
                 place the finished page is corrected by hand
```

**The owner can read the book before sealing it, and could not before.**
Sealing is irreversible and a **view** link is what publication creates, so the
only way to see what a family would read was to publish it to them first —
while `BookPanel` said "read it through before sealing it". `/preview/[memoirId]`
is that reading: the same `ReaderFrame`, the same pages, addressed by memoir id
and the owner's bearer token. The backend needed nothing —
`GET /memoirs/{id}/chapters` exists for this and `_reachable_chapter` tries the
owner's credential before any link. It is the one reader screen fetched in the
browser, because a Supabase session lives in `localStorage` where a server
render cannot see it. The comment lane is open to the owner, on their bearer
token: the backend attributes the comment to the owner participant, and a
comment left on the draft is re-surveyed with the passage when it is reworded.

`src/app/(app)/` is a route group: parenthesised, so it adds a layout without adding a URL
segment. **Its `main` is full-bleed and centres nothing** — a page is bands at different weights
(a `--paper-deep` title band with a rule under it, then the ordinary page), and a band cannot run
edge to edge inside a centred column. Width belongs to `PageHeader` and `PageBody` in
`components/layout/`, which is where the 1024px measure is declared. Do not put a `max-w-*` back
into the layout. `/onboarding`, `/j/[token]`, `/m/[token]` and `/preview/[id]` sit outside it on purpose — the first is
reached before an account exists, the other two by people who will never have one.

**There are two doors, and onboarding is only one of them.** `/` is a real
landing page and `/signin` signs an existing account back in — both outside the
`(app)` group, both with their own chrome. Before they existed, `/` redirected
to `/archive`, which bounced a signed-out visitor into `/onboarding`, so the
only way back into an account was to run the whole flow again and be told at
the end by `memoir_one_per_account`'s 409 that you already had a memoir.

`RequireSession` now sends a signed-out visitor to `/signin` rather than
`/onboarding` — somebody who bookmarked `/archive` has an account, and "before
we begin, one promise" is the wrong answer to an expired session; `/signin`
links onward for the genuinely new. Signing out lands on `/` for the same
reason. The sign-in form calls **Supabase only** — no `apiRequest` anywhere in
it, because a token is all this product's API ever wants.

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

**A memory is not one thing.** Writing, photographs and recordings go in together — the two
attachment rows in the composer are _toggles_, not a choice, and both can be lit alongside the
writing. **Writing itself is not a toggle: it is always on.** The sheet is the page, and a composer
whose writing surface can be switched off is a blank screen with a date picker on it. A memory can
still be photographs or a recording with nothing typed — an empty box saves as no text at all, and
the one rule that matters (a memory needs _something_ in it) is enforced before the round trip and
again by the backend's `EmptyMemory`. Both the owner's
`MemoryComposer` and the contributor's `ContributeForm` share `useAttachments()` from
`features/media`, because they ask a person for the same things and two copies of that state is how
one of them grows a bug the other has not. **Turning a tile off discards what was in it** and
revokes its object URLs — anything else uploads a recording the person believes they removed.
**But it asks first.** That used to happen on one tap, with no confirm and no undo, and the files
exist nowhere else: nothing is uploaded until Save, `PhotoPicker` keeps only its downscaled blob,
and a recording's chunks only ever lived in that array. So `useAttachments` splits the two —
`toggle()` lights a section or puts out an empty one, `holds()` says whether a tap would destroy
something, and `discard()` is reached only once the person has answered `DiscardPrompt`. Note which
way round this was: deleting an already-saved asset in `MemoryEditor` had a two-tap confirm, and the
unrecoverable case did not.

Do not send `kind`. The backend derives it from what the memory holds; the request schemas have no
such field, and the response schema still does.

**Nobody faces a blank page, and the owner decides what they face instead.**
`/questions` is where a memoir's question library is made: the owner writes a
line about the subject, a model drafts four or five easy questions for each
`relationship_group`, and they edit any of them by hand or ask for a fresh set.
`questions_mode` still chooses between that and the standard questions every
memoir starts with, and switching destroys neither set — but **the screen no
longer shows the choice**. Writing a set sets the mode to `custom` on the
backend (`prompt_service.py`), so the control's only correct answer was already
given by pressing the button; the page shows what a contributor would be asked
today and nothing about which bucket it came from. The endpoint and
`useSetQuestionsMode` remain, unused by the screen.

**`self` is not a group the owner is shown.** It means the subject writing their
own memoir, which nobody arriving through a share link is doing — the contribute
form has never offered it either. It stays in `relationshipGroupSchema` because
the column still has it and a response carrying it must parse; it is simply
absent from `GROUP_ORDER`.

A question the owner rewrites becomes `source: "owner"` and survives every
later rewrite. That is the whole mechanism, and it is why the row says so.

The contributor half lives in `features/invitation`: the questions appear above
the composer as things to write _about_, not as a field each. There is still one
box. No numbering, no "answered" state, no count — `AGENTS.md` on the backend
forbids gamification, and a ticked-off list of questions is a progress bar.

An earlier version of this generated a question per contributor after each
memory, and the owner never saw any of it. `features/questions/README.md`
explains at length why that was the wrong shape.

**The contribute form asks how somebody knew the subject.** It has to: questions
are per relationship, and until it asked, every contributor in every memoir was
stored as `other` — which also meant the reader's credit lines all read "other".
Optional, and it says so; skipping it leaves you in the `other` group rather
than blocking the memory.

**The book is behind a door.** A view link is made to be forwarded, and every
forward is a copy of the whole memoir — so the link is half a credential. The
other half is a passphrase the owner sets when they seal it, and
`POST /r/{token}/open` exchanges the two for a **reader session** kept in a
cookie (not `localStorage`: `/m/[token]` is server-rendered, and a server render
cannot see `localStorage`). The owner is recognised by their Supabase session
and let through without either.

Identity is taken **once, at the door**, which is why `commentCreateSchema`
carries no name: a person used to be able to read a whole family's memoir as
nobody at all and be asked who they were only if they had something to say.
Every way of failing to open one answers 404 and the gate says one sentence for
all of them — "that link is real but your passphrase is wrong" is what turns a
forwarded link into something worth guessing at.

**The archive is where the book is made, in three steps.** `BookPanel` on
`/archive` plans the memoir, then assembles it, then seals it, links to it, and
exports the PDF. **"View the memoir" is always there** — it is how the owner
sees the real page, and gating it on `chapter_count` hid it at exactly the
moment somebody went looking. The PDF still waits for a chapter, because a PDF
of nothing is a broken file where a page of nothing is a title page that says
so. Nothing anywhere is disabled rather than absent: a disabled button is a
promise with a reason to guess at.

**Planning is the step that used to be invisible.** A model reads the whole
archive — every memory, every transcript, every photograph as an image — and
decides where the chapters divide, what each is called, and which photograph
belongs beside which paragraph. That decision is now a stored draft the owner
reads before anything is written: `PlanOutline` renders it, and lets them
rename a chapter, move one, or leave one out. `PATCH` takes the whole chapter
list because order is array position, renumbered server-side, so nothing here
invents an ordinal.

It is up-and-down buttons, not drag-and-drop: a memoir has a handful of
chapters, the app carries no drag dependency, and arrows are keyboard-reachable
for free. The outline is keyed on the plan's timestamps so regenerating hands
it a fresh draft rather than leaving it holding chapter ids the server no longer
has.

**`organised_by` is shown, not hidden.** `planner` means the model read the
archive; `by_date` means it could not and the decade fallback ran. The two are
indistinguishable once the book is written, and a backend with no model key
produces `by_date` for every memoir — so the outline says which one this was.

**The outline stays editable until the memoir is sealed.** It used to freeze
the moment the book was assembled, which was wrong about which fact protects
the character offsets underneath: publication is, not assembly, and an unsealed
book is rewritten wholesale by the next assemble. So `PlanOutline` goes
read-only on `published_at` alone, and **"Assemble again"** is how a corrected
outline reaches the page.

**And the page itself is corrected by hand, at `/preview/[memoirId]`.**
`PageEditor` swaps the finished page for the same page with controls on it:
reword a passage, reorder, remove, rename the chapter, move a photograph
beside another paragraph, add a section. `PATCH /chapters/{id}` — owner only,
409 once sealed.

**A section is always a memory.** "Add a section here" offers the archive, or
a box for the owner's own words — which are saved as a memory first, through
`useCreateMemory`, and only then placed. So every passage still has a person
behind it. New photographs and recordings come in through the archive; the
editor says so and links to `/archive/new`.

**Planning again replaces a corrected outline, and assembling again replaces
a corrected page.** The panel says so before either button is pressed.

**The reader is a book, and it is addressed by a link.** `/m/[token]` resolves a **view**-scoped
`memoir_link` — a different scope from the contribute link behind `/j/[token]`, so a link posted in
a family group chat cannot be used to write into the archive, and a link that lets somebody add
memories does not also hand out the finished book. Both pages are server-rendered because a link
token needs no browser-held credential.

Four things about `features/memoir` that are load-bearing rather than stylistic, and are explained
at length in its README:

- **A chapter is assembled from many people, so every clause is traceable.** `block_source` carries
  character offsets into the paragraph. The prose itself carries no marks; a numeral in the left
  gutter is both the citation key and the durable deep link, and hovering a credit underlines the
  exact words it fathered. This is what makes the "never fabricate" rule checkable by a reader
  rather than merely asserted.
- **The book is one scrolling page.** Title page, the chapters in order, the
  people, the colophon — each a `.page` sheet with an id, stacked down
  `/m/{token}`, every chapter fetched on the server in parallel. The contents
  rail is anchors into it and marks the part under the reader (`ReaderFrame`
  measures it on scroll); a paragraph's anchor is `c{chapter}p{n}` so it is
  unique on the page. `/m/[token]/[page]` and `/preview/[id]/[page]` still
  accept the old per-chapter address and land on the same anchor. `base`
  (`/m/{token}` or `/preview/{id}`) is still what the search and the copy-link
  button build from; hard-coding `/m/` anywhere sends the owner's preview into
  the family's copy, which their session cannot open.
- **Two right-hand lanes, not one.** The margin (photographs and sources) is sealed with the
  memoir; the comment lane grows forever. Sharing a lane would let ten years of comments push a
  photograph away from the paragraph that earned it.
- **Photographs are shown in turn after the paragraph they belong to.** `carousel` is the only
  placement written since backend migration 0018; the group is the shared `anchor_block_id`. The
  carousel stops on hover and focus, carries a pause control (WCAG 2.2.2), and does not move under
  `prefers-reduced-motion`. One photograph renders as a plate.
- **A recording is a figure too.** `figure.medium` is `image` or `audio`; a recording the planner
  placed renders as `RecordingPlate` — an `<audio preload="none">` after the carousel. The margin
  `VoiceCredit` is a credit, not a player.
- **A pulled line is a quotation.** A `pull` block is one person's exact words, drawn as a
  blockquote with their name under it.
- **Comments are blurred until reached for.** The comment lane's cards carry `filter: blur` and
  sharpen on hover, focus, or when the words they anchor to are hovered (`litThread`).
- **The frame is a fixed width and the prose column is offset by a constant**, so collapsing the
  contents rail cannot reflow a single line. Making the column a fraction of the frame breaks this
  and will not show up in a screenshot.

Anchoring by character offset is only safe because **publication is immutable** — the text can
never move out from under an offset. If a published chapter ever becomes editable, every anchor in
that feature needs rebasing.

The one place text legitimately moves is _before_ assembly, when the owner rewords a passage in the
plan. The backend's `plan_service.resurvey` handles it by re-finding each span rather than adjusting
it, and dropping to whole-block attribution when the words are gone or now ambiguous. Nothing in
this feature has to know — by the time a chapter exists, its offsets are true again.

**A comment is left by a `memoir_participant`, never a user.** `features/memoir` borrows
`useRememberContributor` from `features/invitation` so the token is stored under the same
memoir-scoped key. A second copy would put one human in a memoir twice — the exact bug
`contributorStorage.ts` exists to prevent.

**Transcripts arrive by polling, and the polling stops by itself.** Every voice note is transcribed
automatically by the backend. `useMemories` and `useMyContributions` set `refetchInterval` from
`hasPendingTranscript()` — five seconds while a recording is still being written out, `false`
otherwise — so an archive of photographs, or one whose transcripts have all landed, never refetches.
Render with `TranscriptReader` from `features/media`. It is a `<details>` disclosure, **closed by
default** — a memoir with twenty recordings would otherwise be a grid of enormous cards. It shows a
quiet line while processing, says so plainly when a recording was `skipped` for budget, and renders
**nothing at all** on failure, because a family cannot act on a provider's error and the audio is
unaffected.
