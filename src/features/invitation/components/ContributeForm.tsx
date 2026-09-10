"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  useContributorQuestions,
  useContributorToken,
  useMyContributions,
  useSubmitContribution,
} from "@/features/invitation/hooks";
import {
  contributionFormSchema,
  type ContributionFormValues,
  type Invitation,
  type RelationshipGroup,
} from "@/features/invitation/schemas";
import { RELATIONS } from "@/features/onboarding/data";
import {
  DiscardPrompt,
  PhotoPicker,
  TranscriptReader,
  VoiceRecorder,
  uploadAll,
  useAttachments,
  type Mode,
} from "@/features/media";

/**
 * How somebody knew the subject.
 *
 * `RELATIONS` is reused verbatim from onboarding rather than copied, because
 * the mapping is the same in both directions: an owner saying the subject was
 * "my grandparent" and a contributor saying the same thing both mean the
 * contributor is a grandchild. A second list would be a second place for the
 * enum to drift.
 *
 * "Someone else" is appended because this audience is wider than onboarding's.
 * The link reaches cousins, colleagues, neighbours and in-laws, and asking
 * them to pick the closest of four wrong answers would put them in a group
 * whose questions are not for them. `self` is deliberately absent: it means
 * the subject writing their own memoir, which nobody arriving through a share
 * link is doing.
 */
const KNEW_THEM: [string, RelationshipGroup][] = [
  ...(RELATIONS as [string, RelationshipGroup][]),
  ["Someone else", "other"],
];

/**
 * "Tell us something about them." — the contributor's form.
 *
 * Everything here works without an account, and it has to: the people with the
 * most to say about someone are often the least willing to sign up for
 * anything. The link is the whole credential.
 *
 * It leads with the questions, then the sheet they write on, and keeps who
 * they are and how they knew the subject in a rail beside it. Nobody should
 * face a blank page, and this page used to be one.
 *
 * The name field is the only thing asked that a signed-in product would not
 * have to ask. There is no account to look a name up from, so the family would
 * otherwise receive a memory from nobody.
 */
export function ContributeForm({
  token,
  invitation,
}: {
  /** The share token from the URL. */
  token: string;
  invitation: Invitation;
}) {
  const participantToken = useContributorToken(invitation.memoir_id, token);
  const submit = useSubmitContribution(token, invitation.memoir_id);
  const { data: mine } = useMyContributions(token, participantToken);

  /*
    How they knew the subject. Null until they say, and null is sent as
    nothing rather than as "other" — the backend leaves an unstated
    relationship alone instead of overwriting one they gave last time.

    Held here rather than in react-hook-form because it is chips, not a field:
    there is no validation on it and no error to show. Leaving it unanswered
    is allowed, and a contributor who skips it is simply in the `other` group.
  */
  const [picked, setPicked] = useState<RelationshipGroup | null | undefined>(
    undefined,
  );

  /*
    The questions, asked for the group they have just tapped.

    `picked` and not `knewThem`, which is derived from this very response —
    passing that back in would be a loop. Untouched chips send nothing, and the
    backend answers from whatever their token says, which is what fills the
    chips in below.
  */
  const { data: asked } = useContributorQuestions(
    token,
    participantToken,
    picked ?? null,
  );

  const attachments = useAttachments(["text"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  /*
    Which question they tapped to write about. Purely local: nothing is sent,
    nothing is stored, and the memory is not filed against it. It only heads
    the sheet, so the box is not blank when they start.

    Still no numbering, no "answered" state and no count — a ticked-off list of
    questions is a progress bar, which `AGENTS.md` forbids.
  */
  const [writingAbout, setWritingAbout] = useState<string | null>(null);

  /**
   * Which section has been asked about but not yet answered.
   *
   * Turning a section off throws away what was in it and the files exist
   * nowhere else — nothing is uploaded until they press the button — so a tap
   * that would destroy something asks first. See `useAttachments`.
   */
  const [asking, setAsking] = useState<"photo" | "voice" | null>(null);

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: { display_name: "", body_text: "" },
  });

  /*
    The name already on record, taken from what they have added before.

    No new endpoint needed: every memory carries the name it was attributed to,
    and this list is theirs by definition. Null on a first visit, which is
    exactly when the field should be empty.
  */
  const knownName = mine?.[0]?.contributor_name ?? null;

  /*
    The group they are already in, from the questions they were served. Same
    idea as `knownName`: no new endpoint, because the answer is already on
    something we fetch.

    `other` is not prefilled — it is the value for somebody who never said, so
    showing it selected would be the form claiming they answered.
  */
  const knownRelationship =
    asked?.relationship && asked.relationship !== "other"
      ? asked.relationship
      : null;

  /*
    Fill the name in, once, when it arrives.

    The form used to start empty every visit and the backend used to throw the
    typed name away — so a returning contributor retyped a name that was then
    ignored, which is why their old name kept appearing. Both halves are fixed:
    the backend honours it now, and this stops asking for something it already
    knows.

    Guarded on `isDirty` so the answer landing mid-typing cannot overwrite what
    somebody is in the middle of writing.
  */
  const { reset: resetForm, formState: nameFormState, getValues } = form;
  useEffect(() => {
    if (!knownName || nameFormState.isDirty) return;
    if (getValues("display_name")) return;
    resetForm({ display_name: knownName, body_text: getValues("body_text") });
  }, [knownName, nameFormState.isDirty, resetForm, getValues]);

  /*
    Derived, not synced by an effect. `undefined` means they have not touched
    the chips this visit, so whatever they told us last time is shown; `null`
    means they deliberately cleared it. An effect copying one into the other
    would fire again on every refetch and undo a tap.
  */
  const knewThem = picked === undefined ? knownRelationship : picked;

  /*
    Shown only when they change a name that was already stored, because that is
    the only case where anything already sent is affected.

    `useWatch` rather than `form.watch()`: the latter returns a fresh function
    each render, which the React Compiler cannot memoize, so it bails out of
    optimising this whole component. Same value, one that can be tracked.
  */
  const typedName = useWatch({ control: form.control, name: "display_name" });
  const renaming = Boolean(knownName) && typedName.trim() !== knownName;

  const busy = isUploading || submit.isPending;
  const firstName = invitation.subject_name.split(" ")[0];

  /**
   * Light a section, or put it away.
   *
   * Only the two that can be put away. **Writing is always on** — the sheet is
   * the page, and a contribute form whose box can be switched off is a screen
   * with nothing on it. Somebody can still leave only a photograph or only a
   * recording; an empty box is simply no text.
   */
  function toggle(mode: Extract<Mode, "voice" | "photo">) {
    // Putting a section out throws away what was in it, and the files exist
    // nowhere else — nothing is uploaded until they press the button — so a tap
    // that would destroy something asks first. See `useAttachments`.
    if (attachments.isActive(mode) && attachments.holds(mode)) {
      setAsking(mode);
      return;
    }

    setAsking(null);
    attachments.toggle(mode);
  }

  async function onSubmit(values: ContributionFormValues) {
    setProblem(null);
    setJustAdded(false);

    // Writing is always on, so there is no lit-section gate here any more. An
    // empty box is simply no text, and the rule below still catches a
    // contribution with nothing in it at all.
    const body = values.body_text?.trim() ?? "";

    if (
      !body &&
      attachments.photos.length === 0 &&
      attachments.recordings.length === 0
    ) {
      setProblem(
        "Add something first — a few words, a photograph, or a recording.",
      );
      return;
    }

    try {
      // The link is the credential for the uploads too — a contributor has no
      // bearer token, and the backend accepts either.
      const credential = { kind: "link", linkToken: token } as const;

      setIsUploading(true);
      const assetIds = await uploadAll(
        [
          ...attachments.recordings.map((recording) => ({
            blob: recording.blob,
            kind: "audio" as const,
            durationMs: recording.durationMs,
          })),
          ...attachments.photos.map((photo) => ({
            blob: photo.blob,
            kind: "image" as const,
            filename: photo.filename,
          })),
        ],
        { memoirId: invitation.memoir_id, credential },
      );
      setIsUploading(false);

      await submit.mutateAsync({
        body_text: body || null,
        asset_ids: assetIds,
        display_name: values.display_name,
        // Omitted entirely when unanswered, rather than sent as "other".
        ...(knewThem ? { relationship: knewThem } : {}),
        participant_token: participantToken,
      });

      form.setValue("body_text", "");
      attachments.reset(["text"]);
      setWritingAbout(null);
      setJustAdded(true);
    } catch (error) {
      setIsUploading(false);
      setProblem(
        error instanceof Error
          ? error.message
          : "That could not be added. Nothing has been lost — please try again.",
      );
    }
  }

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-11 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start"
      >
        {/* ------------------------------------------------------------ */}
        {/* Prompts first: nobody should face a blank page                */}
        {/* ------------------------------------------------------------ */}
        <div>
          {/*
            The questions, above the sheet rather than inside it.

            They are things to write *about*, not fields to fill in — there is
            still one box below, and somebody can answer one question, four, or
            none of them. A field per question would turn a memory into a form,
            and the person reading this was sent a link by a grieving relative.

            Shown from the first visit, before anything has been contributed —
            that is the visit they are for. Tapping a chip in the rail changes
            them, because what you ask a widow is not what you ask a colleague.

            No numbering, no "answered" state, no count. `AGENTS.md` forbids
            progress indicators and a ticked-off list of questions is one.
          */}
          {asked && asked.questions.length > 0 && (
            <section>
              <p className="eyebrow">If you are not sure where to start</p>
              <ul className="mt-4 border-t border-border">
                {asked.questions.map((question) => {
                  const on = writingAbout === question;
                  return (
                    <li key={question} className="border-b border-border">
                      <button
                        type="button"
                        onClick={() => setWritingAbout(on ? null : question)}
                        aria-pressed={on}
                        className="flex w-full items-baseline gap-4 py-3.5 text-left"
                      >
                        <span
                          aria-hidden
                          className={`mt-2 size-1.5 shrink-0 rotate-45 ${on ? "bg-seal" : "bg-rule"}`}
                        />
                        <span
                          className={`font-heading text-[18px] leading-[1.5] font-light ${on ? "" : "text-muted-foreground"}`}
                        >
                          {question}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ---------------------------------------------------------- */}
          {/* The sheet they write on                                     */}
          {/* ---------------------------------------------------------- */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-7 shadow-lift sm:px-8 sm:pt-8 sm:pb-7">
            <p className="eyebrow">
              {writingAbout
                ? `Answering: ${writingAbout.toLowerCase()}`
                : `What you remember about ${firstName}`}
            </p>

            <label htmlFor="body_text" className="sr-only">
              What you remember
            </label>
            {/*
              An underline-free writing surface, not a boxed textarea:
              `docs/DESIGN-SYSTEM.md` §5. The sheet is the box, and it is always
              here — see `toggle` above.
            */}
            <textarea
              id="body_text"
              rows={7}
              placeholder="Start with the detail you remember most clearly…"
              disabled={busy}
              {...form.register("body_text")}
              className="mt-4 field-sizing-content block min-h-[210px] w-full resize-y border-0 bg-transparent font-heading text-[19px] leading-[1.72] font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:outline-none disabled:opacity-60"
            />

            {attachments.isActive("voice") && (
              <div className="mt-6 border-t border-border pt-5">
                <VoiceRecorder
                  recordings={attachments.recordings}
                  onRecorded={attachments.addRecording}
                  onRemoved={attachments.removeRecording}
                  disabled={busy}
                />
              </div>
            )}

            {attachments.isActive("photo") && (
              <div className="mt-6 border-t border-border pt-5">
                <PhotoPicker
                  photos={attachments.photos}
                  onPicked={attachments.addPhotos}
                  onRemoved={attachments.removePhoto}
                  disabled={busy}
                />
              </div>
            )}

            <fieldset
              disabled={busy}
              className="mt-5 border-t border-border pt-4"
            >
              <legend className="sr-only">
                What would you like to add? Choose any.
              </legend>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant={
                    attachments.isActive("voice") ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggle("voice")}
                  aria-pressed={attachments.isActive("voice")}
                >
                  <Mic aria-hidden />
                  Say it instead
                </Button>
                <Button
                  type="button"
                  variant={
                    attachments.isActive("photo") ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggle("photo")}
                  aria-pressed={attachments.isActive("photo")}
                >
                  <ImageIcon aria-hidden />
                  Add a photograph
                </Button>
              </div>

              {asking && (
                <div className="mt-4">
                  <DiscardPrompt
                    mode={asking}
                    count={
                      asking === "photo"
                        ? attachments.photos.length
                        : attachments.recordings.length
                    }
                    onKeep={() => setAsking(null)}
                    onRemove={() => {
                      attachments.discard(asking);
                      setAsking(null);
                    }}
                    disabled={busy}
                  />
                </div>
              )}
            </fieldset>
          </div>

          {/*
            The promise this page makes, stated where it is relevant rather
            than in a footer nobody reads. It is also true: the backend gives a
            contributor no way to read the archive.
          */}
          <p className="mt-5 font-sans text-xs leading-relaxed text-ink-faint">
            What you add is shared with {invitation.invited_by || "the family"}.
            You will not see the archive or anyone else&apos;s memories.
            Anything you record is written out automatically by a transcription
            service, so the family can read it as well as hear it.
          </p>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* The rail: who you are, and how you knew them                  */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="display_name" className="eyebrow block">
              Your name
            </label>
            <input
              id="display_name"
              placeholder="Yusuf Ali"
              disabled={busy}
              {...form.register("display_name")}
              className="mt-3 block w-full border-0 border-b border-ink bg-transparent pb-2 font-heading text-xl font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:border-seal focus:outline-none disabled:opacity-60"
            />
            {form.formState.errors.display_name ? (
              <p className="mt-2.5 font-sans text-sm text-seal">
                {form.formState.errors.display_name.message}
              </p>
            ) : (
              <p className="mt-2.5 font-sans text-xs leading-relaxed text-ink-faint">
                So the family knows who this came from.
              </p>
            )}
            {/*
              Said before they save, not after.

              The name is stored against the person rather than on each memory,
              so changing it changes what is shown above everything they have
              already sent. That is the right behaviour — it is the same person
              and this is their name — but it is not what somebody editing a
              single field would assume, so it is spelled out.
            */}
            {renaming && (
              <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
                This also updates the name shown on what you have already added.
              </p>
            )}
          </div>

          {/*
            Asked because it changes what this person is shown, not to sort
            them. What you ask a widow is not what you ask a colleague, and
            until this existed every contributor was stored as "other" and got
            one generic set.

            Optional, and it says so. Somebody who does not want to categorise
            their relationship to a person they have lost should not have to in
            order to leave a memory.
          */}
          <fieldset disabled={busy} className="border-t border-border pt-5">
            <legend className="eyebrow">How you knew {firstName}</legend>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {KNEW_THEM.map(([label, group]) => {
                const on = knewThem === group;
                return (
                  <button
                    key={group}
                    type="button"
                    // Tapping the chosen one again clears it, so a mis-tap is
                    // undoable without reloading the page.
                    onClick={() => setPicked(on ? null : group)}
                    aria-pressed={on}
                    className={`border px-4 py-2.5 font-sans text-[13px] transition-colors ${
                      on
                        ? "border-seal bg-seal text-paper"
                        : "border-border text-muted-foreground hover:border-ink-faint hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
              Optional. This decides which questions you are asked — a
              grandchild is asked different things than an old colleague.
            </p>
          </fieldset>

          <div className="border-t border-border pt-5">
            {problem && (
              <p role="alert" className="mb-3 font-sans text-sm text-seal">
                {problem}
              </p>
            )}
            {justAdded && (
              <p role="status" className="mb-3 font-sans text-sm text-seal">
                Added. Thank you — you can leave another if more comes back to
                you.
              </p>
            )}

            <Button type="submit" disabled={busy} className="h-12 w-full">
              {isUploading
                ? "Uploading…"
                : submit.isPending
                  ? "Adding…"
                  : "Add this to the memoir"}
            </Button>
            <p className="mt-3.5 font-sans text-xs leading-relaxed text-ink-faint">
              You can come back and add more whenever you like — this link keeps
              working.
            </p>
          </div>
        </div>
      </form>

      {mine && mine.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-2.5">
            <h2 className="font-heading text-[21px] font-normal tracking-tight">
              What you have added
            </h2>
            <span className="eyebrow-muted">Newest first</span>
          </div>

          <ul>
            {mine.map((memory) => (
              <li key={memory.id} className="border-b border-border py-6">
                <p className="eyebrow">
                  {memory.kind === "voice"
                    ? "Voice note"
                    : memory.kind === "photo"
                      ? "Photograph"
                      : "Written"}
                </p>
                {memory.body_text && (
                  <p className="mt-3 max-w-[62ch] font-heading text-[17px] leading-[1.7] font-light">
                    {memory.body_text}
                  </p>
                )}

                {/* Every asset, not just the first — one contribution can now
                    carry several photographs and several recordings. */}
                {memory.assets
                  .filter((asset) => asset.kind === "audio" && asset.url)
                  .map((asset) => (
                    <div key={asset.id} className="mt-4 space-y-2">
                      <audio
                        controls
                        src={asset.url ?? ""}
                        className="w-full border border-border bg-paper-deep p-2.5"
                      />
                      <TranscriptReader transcript={asset.transcript} />
                    </div>
                  ))}

                {memory.assets.some(
                  (asset) => asset.kind === "image" && asset.url,
                ) && (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {memory.assets
                      .filter((asset) => asset.kind === "image" && asset.url)
                      .map((asset) => (
                        <li key={asset.id}>
                          {/* A signed, expiring URL from a private bucket,
                              which `next/image` cannot fetch. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.url ?? ""}
                            alt="A photograph you added"
                            className="h-28 w-full border border-border object-cover"
                          />
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
