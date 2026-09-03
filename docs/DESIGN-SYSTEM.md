# The Memoir Project — Design Brief

A complete description of how this product looks, sounds, and behaves. Written to be handed to a
designer (human or Claude Design) who has never seen the codebase, so that anything new they draw
sits beside the existing screens without looking imported.

Everything below is extracted from the built product, not aspirational. Source of truth:
`src/features/onboarding/onboarding.module.css` (1129 lines), the fourteen components in
`src/features/onboarding/components/`, and `src/app/onboarding/page.tsx`.

---

## 1. What the product is

The Memoir Project turns a family's scattered memories of one person into a finished, permanent
memoir. One person — the organiser — names who the memoir is for, pays, and shares a single link.
Everyone else (family, friends, old colleagues) contributes voice notes, text and photographs from
any phone, **without ever making an account**. The system drafts chapters from what comes in. The
organiser edits the titles and publishes once. Publishing is irreversible by design: the memoir is
sealed, and only a comment layer stays open forever.

Two ideas drive every visual decision:

1. **This will outlast the people using it.** The interface should feel like a printed object, not
   a web app. Permanence, not engagement.
2. **The subject is usually dead.** Nothing celebratory, nothing playful, no confetti, no emoji, no
   exclamation marks. Warm and steady, never mournful and never cheerful.

---

## 2. The feeling

Think a well-set hardback and a letterpress title page. Ivory paper stock, a single oxblood ink for
anything that matters, hairline rules instead of boxes, generous silence around type. The nearest
reference points are a Folio Society endpaper, an obituary in a serious newspaper, and a museum wall
label — **not** a SaaS dashboard, not Material, not a card-and-shadow UI.

Every screen floats a translucent "sheet" of paper over a large, heavily faded photograph of
ordinary domestic life. The photograph is felt more than seen.

---

## 3. Palette

Nine values. There is no tenth.

| Token | Hex | What it is | Where it goes |
|---|---|---|---|
| `--paper` | `#fbf9f4` | Warm ivory | Page background; text on seal-coloured fills |
| `--paper-deep` | `#f3efe5` | One shade deeper ivory | Book cover stock, link box, quote block, disabled buttons, hover on outline buttons |
| `--ink` | `#1c1a17` | Near-black, warm | All headings and primary body text |
| `--ink-soft` | `#706a60` | Warm mid grey | Sub-copy, secondary labels, tertiary buttons |
| `--ink-faint` | `#a69e91` | Warm light grey | Eyebrows, metadata, placeholders, disabled and pending states |
| `--seal` | `#7c1015` | Oxblood / sealing wax | **The only accent.** Primary buttons, field labels, active states, the diamond mark, ticks, focus rings |
| `--seal-dark` | `#5e0c10` | Deeper oxblood | Hover on primary buttons; the wipe fill on the pledge button |
| `--seal-wash` | `#faf3f1` | Palest pink | Reserved tint (available, currently unused) |
| `--rule` | `#dfd8c9` | Warm sand | Every hairline: borders, dividers, table rows, wheel bands |

**Rules about colour**

- Oxblood is scarce on purpose. If more than roughly one element per screen is oxblood, it has
  stopped meaning anything. It marks the single next action and nothing else.
- There is **no green, no amber, no blue**. Success, warning and info are all communicated in words,
  in ink-soft. A destructive or irreversible action is oxblood, same as a normal primary action —
  the weight comes from the copy, not a red alert colour.
- No pure black (`#000`) and no pure white (`#fff`) anywhere.
- **Dark mode exists, and it is nine re-picked values — not an inversion.** The brief for it is
  the same object under a lamp: still warm, never a cool grey, never pure black. Two of the nine
  are not simply darker versions of themselves. `--paper-deep` swaps role, because a raised card
  has to be *lighter* than the ground in dark or it reads as a hole. And `--seal` lifts from
  `#7c1015` to `#cf6a60`, because the daylight oxblood measures 1.71:1 against a near-black page
  and an eyebrow set in it would be invisible — wax under lamplight genuinely is warmer and
  brighter. The one knock-on: the primary button becomes deep-ink-on-warm-red rather than
  ivory-on-oxblood, because on the lifted red deep ink measures 5.19:1 and ivory only 2.98:1.
  Every text token clears AA on the dark ground (ink 15.46, ink-soft 7.08, ink-faint 4.82,
  seal 5.19). All nine live in `src/app/globals.css` and nowhere else; see the comment there.

---

## 4. Typography

Two families, loaded per-route so the rest of the app keeps Geist.

**Display — Spectral** (`--display`), serif. Weights 300 / 400 / 600, normal and italic.
Fallback: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`.
Used for: every heading, every question, all numerals of consequence (prices, statistics, years),
person names, chapter titles, text inputs, and the book cover. Default body weight is **300**,
headings **400**. Italic Spectral is the voice of the memoir itself — the vow, the cover dates,
input placeholders.

**Utility — Inter** (`--utility`), sans. Weights 400 / 500.
Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`.
Used for: everything the interface says about itself — buttons, eyebrows, field labels, metadata,
footnotes, sub-copy, the invite link.

The split is the whole system: **serif is content, sans is chrome.** Never mix them up.

### Type scale

| Role | Family | Size | Weight | Tracking | Case | Colour |
|---|---|---|---|---|---|---|
| Pledge headline | Spectral | `clamp(30px, 5.2vw, 46px)` | 400 | `-0.018em` | Sentence | ink |
| Question (`.ask`) | Spectral | `clamp(27px, 4.8vw, 40px)` | 400 | `-0.015em` | Sentence | ink |
| Dashboard heading | Spectral | `clamp(26px, 4.4vw, 36px)` | 400 | `-0.012em` | Sentence | ink |
| Price amount | Spectral | 54px | 400 | `-0.02em` | — | ink |
| Statistic number | Spectral | 27px | 400 | — | — | ink |
| Cover name | Spectral | 27px | 400 | `-0.005em` | — | ink |
| Text input | Spectral | 26px (19px stacked, 18px pay) | 300 | — | Sentence | ink |
| The vow | Spectral | 21px | 300 *italic* | — | Sentence | ink |
| Chapter title | Spectral | 19px | 400 | — | Sentence | ink |
| Pledge body | Spectral | 18px | 300 | — | Sentence | ink-soft |
| Person name | Spectral | 17px | 300 | — | — | ink |
| Feature title | Spectral | 16px | 300 | — | Sentence | ink |
| Sub-copy (`.ask-sub`) | Inter | 13px / 1.65 | 400 | — | Sentence | ink-soft |
| Chip | Inter | 13px | 400 | — | Sentence | ink-soft |
| Button | Inter | 11.5px | 500 | `0.14em` | UPPER | paper on seal |
| Footnote | Inter | 12px / 1.6 | 400 | — | Sentence | ink-faint |
| Eyebrow | Inter | 10px | 500 | `0.18em` | UPPER | ink-faint |
| Field label | Inter | 10px | 500 | `0.18em` | UPPER | **seal** |
| Statistic label | Inter | 9.5px | 500 | `0.16em` | UPPER | ink-faint |
| Cover dedication | Inter | 9.5px / 1.9 | 400 | `0.2em` | UPPER | ink-faint |

Note the pattern: **as text gets smaller it gets more letter-spaced and moves to uppercase Inter.**
Anything under 11px is uppercase, tracked between `0.14em` and `0.2em`, and is either ink-faint
(metadata) or seal (a field label).

---

## 5. Hard rules

These are not preferences. Breaking one makes a screen read as a different product.

1. **`border-radius: 0` everywhere.** Buttons, inputs, chips, sheets, cards, the book cover, the
   segmented control, the link box. Nothing is rounded. The only curve in the entire product is the
   45°-rotated square used as a diamond mark.
2. **Hairlines, not boxes.** Structure comes from `1px solid var(--rule)` dividers and
   bottom-borders. Avoid filled cards. Tables are rows separated by rules, not grids.
3. **Underline inputs only.** Every text field is a transparent box with a single 1px `--ink` bottom
   border, which turns `--seal` on focus. No filled inputs, no boxed inputs, no outlines.
   Placeholders are italic `--ink-faint`.
4. **One shadow, and it is almost invisible:** `0 24px 60px -40px rgba(28,26,23,0.35)` on the sheet,
   `0 18px 40px -30px rgba(28,26,23,0.6)` on the book cover. Nothing else casts a shadow.
5. **Centred, single column, max 680px.** The product is a page in a book, not a workspace. The only
   two-column layout in the whole flow is the pricing screen, and it collapses at 600px.
6. **No icons except one.** There is a single 24×24 tick SVG on the pricing list
   (`M4 12.5l5.5 5.5L20 7`, `stroke: var(--seal)`, `stroke-width: 1.4`, round caps and joins, no
   fill). No icon set is installed for this feature. If something needs an icon, it probably needs a
   word instead.
7. **The diamond mark is the logo.** A 6×6px `--seal` square rotated 45°. It appears at the top of
   the book cover and, pulsing, as the loading indicator. It is the only ornament.
8. **Focus is always `2px solid var(--seal)`** with `outline-offset` of 2–4px. Never removed.

---

## 6. Motion

Restrained and slow. One easing curve does almost everything:
`--step: 0.35s cubic-bezier(0.22, 0.61, 0.36, 1)`.

- **Step entrance:** every screen fades up — `opacity 0 → 1`, `translateY(10px) → 0`, over `0.4s` on
  the same curve.
- **Background crossfade:** `0.6s ease`, using two permanently-mounted stacked layers that alternate
  which one receives the incoming photograph, so the outgoing image fades out as the new one fades
  in.
- **The pledge seal:** the button's `inset: 0 100% 0 0` oxblood fill wipes left-to-right over
  `0.62s cubic-bezier(0.4, 0, 0.2, 1)` before advancing. This is the single most expressive moment
  in the product and it is never reused.
- **The loading diamond:** opacity `0.25 → 1 → 0.25` over `1.6s ease-in-out`, infinite.
- **Reveal:** the name-step button fades and rises `6px` into existence once the field is valid,
  rather than being disabled-then-enabled.
- **`prefers-reduced-motion: reduce` kills every animation and transition inside `.shell` with
  `!important`**, and switches the year wheels to `scroll-behavior: auto`. Anything new must respect
  this.

No spinners, no skeletons, no bouncing, no spring physics, no parallax.

---

## 7. Components

### Sheet — the container every screen lives in
`max-width: 680px`, `background: rgba(251,249,244,0.9)`, `1px solid var(--rule)`,
`backdrop-filter: blur(1.5px)`, padding `26px 30px 44px`, plus the near-invisible drop shadow.
Translucency matters — the photograph must be faintly readable through the paper. At ≤600px the left
and right borders are removed and padding drops to `20px 18px 34px`, so the sheet runs full-bleed
like a page.

### Buttons
All uppercase Inter 11.5px / 500 / `0.14em`, padding `17px 38px`, square, no border.

- **Primary** — `--seal` fill, `--paper` text. Hover `--seal-dark`. Disabled: `--paper-deep` fill,
  `--ink-faint` text, `not-allowed`.
- **Text** — no fill, `--ink-soft`, padding `17px 8px`, transparent bottom border that becomes
  `--ink-faint` on hover while text goes to `--ink`. This is the "decline" action.
- **Outline** — no fill, `--ink` text, `box-shadow: inset 0 0 0 1px var(--rule)`, hover fills
  `--paper-deep`. Used only for "Continue with Google".
- **Quiet** — 13px sentence-case Inter, `--ink-soft`, `1px` rule underline, padding `6px 2px`. Turns
  `--seal` (text and underline) on hover. Used for share/secondary links.
- **Jump** — 11px uppercase `0.14em` `--ink-faint`, no border. Prototype escape hatches.

Action rows sit `46px` below content, centred, `18px` gap, with the primary on the **right**. At
≤600px the row becomes `column-reverse` and every button goes full width — so the primary ends up on
top.

### Field
Centred block, `max-width: 440px`, `36px` top margin. Seal-coloured uppercase label 14px above a
`.rule-input`. In stacked contexts (signup, payment) the label and input left-align and the input
drops to 19px / 18px.

### Chips
Single-select. `1px solid var(--rule)`, transparent, Inter 13px `--ink-soft`, padding `12px 19px`.
Hover raises the border to `--ink-faint` and text to `--ink`. Selected fills `--seal` with `--paper`
text. Wrapped, centred, `8px` gap, `max-width: 520px`.

### Stepper
Four `34×2px` bars, `6px` apart. `--rule` when upcoming, `--seal` when done, and `--seal` plus a
`0 0 0 1px` seal ring when current.

### Year wheel
A `150px`-tall scroll-snap picker, `44px` per row, `160px` wide column. The centred row is banded by
a top and bottom hairline and renders at Spectral 26px `--ink`; every other row is 20px
`--ink-faint`. Paper gradients mask the top and bottom `52px` so values dissolve rather than clip.
Scrollbar hidden. Keyboard: up/down arrows move one row. Clicking a row scrolls it to centre.

### Book cover
The product's emblem. `250px` wide, `--paper-deep` stock, `1px` rule border, with a **second inset
rule border 9px inside it** — a printed title-page frame. Inside, top to bottom: the oxblood
diamond, an uppercase `0.2em` dedication ("In loving memory of", or "The life of" if the subject is
living), the name at Spectral 27px, the years in italic Spectral 15px, a `26px` hairline, and
"AS REMEMBERED BY EVERYONE WHO KNEW THEM" in 9.5px uppercase. Shrinks to 190px on the pricing screen
and 210px on mobile.

The cover always reads **"1936 — Forever"**, never a death year. That is deliberate: the finished
book is not bounded by the second date; only the timeline and memoir page are.

### Statistics bar
A single bordered row divided by hairlines into equal cells. Each cell: Spectral 27px number over a
9.5px uppercase `0.16em` `--ink-faint` label, `22px 6px` padding. Wraps to a minimum of 33% per cell
on mobile.

### People list
A hairline-topped list of rows, each `15px 2px` with a bottom hairline. Three columns on one
baseline: name (Spectral 17px, flexes), relation (Inter 10px uppercase `0.15em` `--ink-faint`),
contribution (Inter 12px `--ink-soft`, right-aligned, `min-width: 92px`). A row that hasn't
contributed gets `.pending` — name and contribution both drop to `--ink-faint`, so absence reads as
a fade rather than a badge. Overflow is a plain line of faint text, not a "+4" pill.

### Link box
`--paper-deep` fill, `1px` rule border, padding `14px 14px 14px 22px`. The URL is Inter 13.5px
`--ink` (breakable) next to a primary button whose label swaps to "Copied" for 1.8s. Above it, a
centred seal-coloured uppercase label.

### Chapter row
Hairline-separated. A `18px`-wide Inter 10.5px faint index number, then an **inline-editable title**
— a borderless Spectral 19px input whose bottom border appears in `--rule` on hover and `--seal` on
focus — over an 11.5px faint meta line. Editorial conflicts are appended to that meta line in
`--seal` (e.g. "Two accounts of the same afternoon differ — both kept."), never as a warning icon or
coloured banner.

### Warning block
`1px solid var(--seal)` box, `22px 24px`, left-aligned Inter 13px `--ink-soft`, opening with a
Spectral 17px `--ink` lead line as a block. No fill, no icon. Used once, for permanence.

### Checkbox row
Centred, `10px` gap, Inter 12.5px `--ink-soft`, `16px` box with `accent-color: var(--seal)`.

### Segmented control
`1px` rule border with a `--rule` background showing through a `1px` gap between options. Options
are `--paper`, uppercase Inter 10.5px `0.14em` `--ink-soft`; hover goes `--paper-deep`; selected
fills `--seal` with `--paper` text.

### Feature list
Hairline-separated rows, `14px 0`, `13px` gap. The seal tick SVG, then a Spectral 16px title over an
11.5px `--ink-faint` description. Closed by a `--paper-deep` block with a **2px seal left border** —
the only left-accent rule in the system.

### Background layer
`position: fixed`, `inset: 0`, `background-size: cover`, `background-position: center 60%`,
`z-index: 0`, `pointer-events: none`. Opacity is set per screen between **0.10 and 0.26** — a
high-contrast photograph is dropped to 0.10 so it never competes with type. Two layers alternate to
crossfade. Six photographs exist in `public/Images/`; screens without one simply show bare paper.

---

## 8. Copy voice

The writing is as much of the design as the palette. Rules, with evidence:

- **Short declarative sentences that end in a full stop.** "Publishing is permanent." "Six
  chapters." "One link, for everyone."
- **Second person, present tense, plain words.** Never "Let's get started!", never "Awesome!", never
  a single exclamation mark in the entire product.
- **Buttons are verbs in the user's own voice, not system labels.** "I pledge to be truthful",
  "Keep this safe", "Now the years", "One last question", "Organize into chapters", "Publish
  permanently", "Not yet", "Leave this for now". Never "Submit", "Next", "OK", or a bare "Continue".
- **Headings interpolate the subject's first name and possessive.** "Ahmed is your…", "What years
  should we show with Ahmed's story?", "Begin Ahmed's memoir". Possessives are computed, so a name
  ending in *s* gets a bare apostrophe (`Charles'`).
- **Explain the reason, not the rule.** Instead of "Required field", the relationship step says
  "This decides which questions your family is asked. A grandchild is asked different things than an
  old colleague."
- **Reassure about permanence and privacy in a quiet closing line**, in 12px faint text at the foot
  of the sheet: "Private and unpublished. Nothing is locked until you publish it yourself." /
  "Handled by Paddle. We never see your card." / "Only invited family can open this. Comments are
  on."
- **Numbers are spelled out in prose, digits in data.** "Six chapters, twenty-three memories, four
  voices" in a sentence; `23` / `31` / `2h 14m` in the statistics bar.
- **No jargon.** Not "onboarding", "workspace", "collaborators", "engagement", "AI-powered". The
  people who use this are grieving relatives, often elderly.

---

## 9. Every screen, in order

Thirteen states in one client-side flow (`src/features/onboarding/types.ts`). The back button walks
`STEP_ORDER` backwards; it is hidden on the first question and visible everywhere else. Each
transition scrolls smoothly to the top.

**0 · Landing / the pledge** — no sheet, bare paper over the strongest photograph (opacity 0.24).
Eyebrow "THE MEMOIR PROJECT", then "Before we begin, / one *promise*." with *promise* in italic
oxblood. Body copy, a 40px hairline, then the vow in italic Spectral 21px: "I will be truthful about
what I remember, and I will let others be truthful about what they remember." A full-width oxblood
button wipes darker over 0.62s and advances.

**1 · Name** — "Who is this memoir for?" One centred underline field labelled THEIR FULL NAME,
placeholder *Ahmed Khan*. The button is hidden until two characters are typed, then fades up reading
"Ahmed's memoir →". Enter submits.

**2 · Relationship** — "Ahmed is your…" with the reasoning sub-copy. Four chips: My parent / My
grandparent / My partner / My friend. Below, an "or" hairline divider and a free-text field "IN YOUR
OWN WORDS", placeholder *The woman who raised me*. Button: "Now the years", disabled until something
is chosen.

**3 · Years** — "What years should we show with Ahmed's story?" / "Scroll to a year. You can make
these exact later." Two wheels, `44px` apart, labelled BORN and THROUGH. Born runs from the current
year back to 1900, defaulting to 1950; Through is the same list plus "Present" and defaults to the
current year. The Through wheel is only committed if the user actually touched it. Button: "One last
question".

**4 · The one thing** — "What should never be forgotten about Ahmed?" / "One thing. It becomes the
first question your family is asked, so start them where you'd start." A single field "IN A LINE" at
21px, placeholder *He fed the whole street during the floods*. Two actions: "Leave this for now"
(text) and "Keep this safe" (primary).

**5 · Signup** — the first sight of the **book cover**, centred at the top of the sheet. Then "Keep
this safe" and "Nothing is saved yet. Everyone you invite gets in by link — you're the only one who
ever needs an account." An outline "Continue with Google" button, an "or" divider, left-aligned
email and password fields, and a full-width "Save the memoir". No background photograph on this
screen.

**6 · Pricing** — the only two-column screen. Left (45%, hairline-divided): the cover at 190px,
"Ahmed's memoir", "Kept for as long as anyone wants to visit it.", a Monthly/Yearly segmented
control, the price at Spectral 54px ($3/month or $30/year — "two months free"), a note, the primary
"Begin Ahmed's memoir" **disabled until the terms checkbox is ticked**, and the checkbox. Right: six
ticked features, closed by the seal-bordered note "Nothing is ever deleted. If you stop paying, the
PDF and every original recording stay yours." The background photograph is dropped to 0.10 here
because it is high-contrast noise. Collapses to one column at 600px.

**7 · Payment** — "Payment details" / "$3 monthly, starting today." Card number, a two-up
Expiry/CVC row, name on card, and "Start subscription". Footnote: "Handled by Paddle. We never see
your card."

**8 · Dashboard — empty state** — eyebrow "MEMOIR SAVED", "Now bring in the family.", "One link, for
everyone." Then the link label, the link box with a Copy button, and a quiet "Share on WhatsApp".
Closing line: "Private and unpublished. Nothing is locked until you publish it yourself."

**9 · Dashboard — collected state** *(the same component, four simulated days later)* — the eyebrow
becomes "AHMED'S MEMOIR", the heading "Four people have added memories.", the sub-copy "Nine were
invited. You can send one reminder to the five who haven't opened it yet." Now the people list
appears (four contributors plus one pending, then "4 others invited, not opened"), followed by the
statistics bar (23 Memories · 31 Photographs · 2h 14m Recorded), the link box, and two actions:
"Send a reminder" (text) and "Organize into chapters" (primary).

**10 · Working** — the pulsing oxblood diamond over one line of status text that advances every
1.5s: "Reading 23 memories…" → "Finding what can be dated…" → "Matching photographs to the stories
that mention them…" → "Drafting chapters…" → "Almost there…". Footnote: "This takes a few minutes.
You can close this and come back — we'll email you when it's ready."

**11 · Review** — "Six chapters." / "These are proposals. Rewrite any title, and nothing is fixed
until you publish." Six inline-editable chapter rows with memory and photograph counts; one carries
an oxblood conflict note. Actions: "Save and come back" (returns to the dashboard) and "Publish".

**12 · Confirm** — "Publishing is permanent." A seal-bordered block: "Once published, this memoir
cannot be edited. No new memories can be added and nothing can be changed — not by you, not by
anyone. If more comes to light later, it becomes a second memoir." followed by "The comment layer
stays open. Your family can keep talking about it, and adding to that conversation, for as long as
they want." A checkbox — "I understand this cannot be undone." — gates "Publish permanently". The
escape is "Not yet".

**13 · Published** — the cover again, "Published. Six chapters, twenty-three memories, four
voices.", the public link box, and two quiet actions: "Download the PDF" and "Tell the
contributors". Closing line: "Only invited family can open this. Comments are on."

---

## 10. Data model

From `src/features/onboarding/types.ts`. The whole flow is one client-side object; nothing is
persisted and nothing calls an API yet.

```ts
type OnboardingState = {
  name: string;          // "Ahmed Khan"
  rel: string | null;    // "child" | "grandchild" | "spouse_partner" | "friend" | "other"
  relLabel: string;      // free text when rel === "other"
  deep: string;          // the one thing that should never be forgotten
  born: string;          // "1936"
  bornSet: boolean;
  through: string;       // "2026" | "present"
  throughSet: boolean;
  collected: boolean;    // prototype toggle: empty vs. populated dashboard
  term: "monthly" | "yearly";
};
```

Fixture data — contributors, chapters, features, plans, working messages — lives in
`src/features/onboarding/data.ts`. The sample family is Pakistani (Peshawar, Kissa Khwani bazaar,
Jamrud Road), which is worth preserving in any new mockup: it keeps the product from defaulting to a
generic Western family.

---

## 11. Context for the dashboard

The dashboard today is a step inside the onboarding flow — a single 680px sheet the organiser passes
through twice, before and after contributions arrive. It currently holds only: a heading, the people
list, the statistics bar, the invite link box, and two actions.

Things it does **not** yet have, which a real dashboard would need:

- Any navigation, header, or way back into it after onboarding ends (there is no `/dashboard` route
  — the flow is one page at `/onboarding`).
- A view of the memories themselves — the 23 memories and 31 photographs are counted but never
  shown, played, read, or attributed.
- Per-contributor detail, resending an individual invite, or removing someone.
- The timeline the pricing page promises.
- Managing the question library that contributors are asked.
- Subscription or account state.
- Any empty, loading, or error state beyond the two hard-coded ones.
- Multiple memoirs per account.

Constraints any dashboard design must hold to:

1. It is used by one person, often elderly, usually grieving, on a phone as often as a laptop.
2. It must not become a workspace. No sidebar of twelve items, no analytics, no engagement metrics,
   no gamification of how many memories the family has sent.
3. The statistics bar exists to reassure ("this is working"), not to measure performance.
4. Waiting is the normal state. The dashboard is mostly a place to check on something slow, so the
   empty and half-full states matter more than the full one.
5. Everything above — palette, two-font split, square corners, hairlines, underline inputs, one
   accent, the copy voice — applies without exception.
