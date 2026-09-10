# features/media

Getting a file from someone's phone into storage. Used by two screens that
share nothing else: the owner's composer (`features/archive`) and the
contributor's page (`features/invitation`).

## The three-step upload

`uploadFile()` in `api.ts` hides it, but it is worth knowing:

1. `POST /media/uploads` — reserve a row, get a URL that works once
2. `PUT <that url>` — the bytes go **straight to Supabase Storage**
3. `POST /media/uploads/{id}/complete` — confirm; the backend asks storage how
   big the file actually is

Step 2 is the only `fetch` in the app outside `lib/api/client.ts`. It goes to
an absolute signed URL at another service carrying raw bytes, not JSON to our
backend, so the rule does not apply — see the comment at the top of `api.ts`.

The asset must exist before the memory does: a file needs somewhere to go
before there is a row to attach it to. `uploadFile` returns an asset whose id
the caller then passes to `createMemory` as `asset_ids`.

## Two credentials

Uploads accept either, and the backend decides which is enough:

| Credential | Who | Header |
| --- | --- | --- |
| `{ kind: "owner" }` | the memoir's owner | `Authorization: Bearer …` |
| `{ kind: "link", linkToken }` | a contributor, no account | `X-Link-Token` |

## Browser notes

- **Audio format varies.** Chrome and Firefox record webm/opus, iOS Safari
  records mp4/aac. Nothing is transcoded; the recorded type is stored and
  `<audio>` plays it back.
- **Recording needs https.** `getUserMedia` is unavailable on plain http
  except on localhost — invisible in development, fatal on first deploy.
  `VoiceRecorder` says so rather than failing silently.
- **Photos are downscaled** to a 2000px longest edge before upload, except
  HEIC, which `canvas` cannot decode and which is passed through untouched.

## Transcripts

Every voice note is transcribed by the backend automatically — there is no
button, and nothing here starts it. `uploadFile()` confirms the upload and the
API takes it from there.

`MediaAsset.transcript` is therefore **null for a while**, then populated. Read
`status`, never the presence of `text`: "still being written out" and "failed"
both have no text and mean completely different things.

| Status | What to show |
| --- | --- |
| `queued`, `processing` | One quiet line. The audio already plays; nothing is blocked. |
| `done` | The paragraphs. |
| `failed`, `skipped` | **Nothing.** |

`TranscriptReader` implements exactly that. Rendering an error for `failed`
would point a grieving family at a problem that is not theirs, cannot be acted
on, and has not damaged their recording.

### Paragraphs, not words

`segments` is paragraph-level: `{start, end, text}` in milliseconds. The
provider can return per-word timings, and the backend deliberately does not ask
— that array is roughly 750 KB per audio hour, fifteen times the transcript
itself. Paragraphs are enough to render readable blocks and, later, to seek.

A transcript with no `segments` still has `text`; `TranscriptReader` falls back
to it.

### The polling rule

`hasPendingTranscript()` in `utils.ts` answers "is anything in this list still
being transcribed?" and is what `useMemories` / `useMyContributions` feed to
`refetchInterval`. It returns false for photographs, for finished transcripts,
and when transcription is switched off — so the ordinary case costs nothing and
the polling stops on its own.

## One memory, many attachments

Both pickers are **lists**. `PhotoPicker` takes several files at once (each
through `downscale()`, in parallel) and `VoiceRecorder` appends each finished
recording, so one memory can carry a handful of photographs and more than one
voice note.

`useAttachments()` owns that state and is shared by the owner's composer and
the contributor's form. They ask a person for exactly the same things, and two
near-identical copies of this state is how one of them quietly grows a bug the
other does not have.

`Mode` has three values but only two of them are ever toggled. **Text is always
on** in both callers: the sheet is the page, and a composer whose writing
surface can be switched off is a blank screen. It stays a `Mode` because
`initial` and `reset` are expressed in the same vocabulary, and because a memory
still legitimately holds no text at all.

The part worth reading is the split between `toggle()`, `holds()` and
`discard()`. Putting a section out still **discards what was in it** and revokes
the object URLs — anything else leaves a recording the person believes they
removed sitting in state, ready to be uploaded when they press Save, which is
the worst possible surprise on this product.

But that used to happen on **one tap of the tile**, with no confirm and no undo,
and the files exist nowhere else: `PhotoPicker` keeps only its downscaled blob,
a recording's chunks only ever lived in that array, and nothing is uploaded
until Save. A mis-tap next to a two-minute voice note destroyed it — while the
*recoverable* case, deleting an already-saved asset in `MemoryEditor`, sat
behind a two-tap confirm.

So `toggle()` now does only the harmless half: lighting a section, and putting
out one that holds nothing. `holds()` tells a caller whether a tap would destroy
something, and `discard()` is the destructive path a caller reaches only once
the person has said so. `DiscardPrompt` is the sentence they are asked, shared
by both callers so the wording cannot drift.

`uploadAll()` in `api.ts` sends every file in parallel and returns the asset
ids. If one fails the whole call rejects; the successes are left as unattached
reservations, which count towards nobody's storage. That is deliberate — better
than saving a memory quietly missing a photograph the person watched themselves
choose.

## `kind` is not yours to send

A memory holds writing, pictures and voice in any combination, so what it *is*
gets derived by the backend from what it holds (`_derive_kind`). The request
schemas carry no `kind`; the response schemas still do, because reading it back
is when the answer is useful.
