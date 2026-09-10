5# features/archive

The owner's view of their memoir: what has been collected, and adding more.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `memorySchema`, `memoryCreateSchema`, and the composer's form rules |
| `api.ts` | `listMemories`, `createMemory`, `updateMemory`, `deleteMemory` |
| `hooks.ts` | `archiveKeys` and one hook per operation |
| `utils.ts` | Formatting: years, dates, kind labels, byte sizes |
| `components/ArchiveScreen.tsx` | `/archive` |
| `components/MemoryComposer.tsx` | `/archive/new` |
| `components/MemoryCard.tsx` | One memory in the grid |
| `components/LeadMemory.tsx` | The newest memory, set at reading size above the grid |
| `components/InviteBanner.tsx` | "One link, for everyone" — the share link, in the archive's second band |
| `components/BookPanel.tsx` | Assemble it, seal it, read it, export it |

## Media comes first

A memory with a photograph or a voice note is **two steps**, in this order:

1. `uploadFile()` from `features/media` puts the file in storage and returns an
   asset
2. `createMemory({ ..., asset_ids: [asset.id] })` creates the memory that
   adopts it

That ordering is not arbitrary — a file needs somewhere to go before there is a
row to attach it to. `MemoryComposer.onSubmit` is a sequence for this reason.

## The book panel

`BookPanel` is the only place in the signed-in app that points at `/m/[token]`,
and the only place a memoir can be sealed. It is the pair to `InviteBanner`:
one collects material, the other turns it into something.

"View the memoir" and "Export a PDF" are **absent, not disabled**, until
`chapter_count` is above zero. A disabled button is a promise with a reason the
person has to guess at; an absent one is answered by the sentence beside it.

Sealing takes a passphrase and is permanent — afterwards the text can never
change, which is what lets every reflection stay anchored to the passage it was
about. There is no route that reads a passphrase back, because nothing in the
building can: it is a scrypt hash, and replacing it is the only move.

## Things that would be product bugs

- **A percentage on the book panel.** Assembly returns four counts and they are
  facts about what the archive turned into, not a score against a total nobody
  has. This is the screen most tempted by it.
- **No progress indicators.** No "your memoir is 40% complete", no streaks, no
  badges, no re-engagement nudges. Counts appear only as plain facts
  ("12 held here"). The empty state is the one most tempted by this and gets
  one quiet line instead.
- **Deletion is confirmed in place**, not optimistically removed. It takes the
  person's photographs and recordings with it, so the card stays until the
  server says it is gone.
- **`never_forget` is owner-only.** The archive renders it as an epigraph; the
  backend's `response_model` on `GET /j/{token}` keeps it away from
  contributors.

## The composer is not a choice

The three tiles are toggles. All three can be lit, and a memory saves with
writing, several photographs and several recordings together — which is how
people actually have material about one afternoon.

Validation is therefore **one rule, not three**: a memory needs *something* in
it. That is checked here before a round trip, again by the backend
(`EmptyMemory` → 400), and underneath both by the database's
`memory_text_has_body`.

`MemoryCard` renders every asset, not the first of each — one photograph large
with the rest beneath, and a player plus transcript per recording. It used to
use `.find()`, which silently hid everything after the first.

## Summary, then detail

`MemoryCard` is a summary and `MemoryDetail` is the thing itself.

The card used to render everything — every photograph, a player and transcript
per recording, the whole text. Twelve of those is not a grid you can look
across, and it fetched a memoir's worth of signed media URLs to build a page
nobody read in full. It now shows one image, an excerpt, and a count of what is
inside.

`/archive/[memoryId]` is a **route, not a modal**: the address is shareable,
refresh works, and the back button does the obvious thing. A dialog would have
needed all three rebuilt and got at least one wrong.

`useMemory()` seeds itself from the list already in the cache, so opening a card
renders instantly; `GET /memories/{id}` is only reached on a cold link or a
refresh.

**Delete lives on the detail page.** It destroys somebody's recording of
somebody's grandmother — it should not sit on a tile you might mis-tap while
scrolling.
