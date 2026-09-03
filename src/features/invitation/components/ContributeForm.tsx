"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Mic, Plus, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useContributorToken,
  useMyContributions,
  useSubmitContribution,
} from "@/features/invitation/hooks";
import {
  contributionFormSchema,
  type ContributionFormValues,
  type Invitation,
} from "@/features/invitation/schemas";
import {
  PhotoPicker,
  TranscriptReader,
  VoiceRecorder,
  uploadAll,
  useAttachments,
  type Mode,
} from "@/features/media";

/**
 * Toggles, not a choice — the same three the owner's composer offers, and for
 * the same reason. Someone who has a photograph of the day, a story about it,
 * and one more thing they remember out loud should not have to file three
 * separate contributions.
 */
const MODES: { mode: Mode; label: string; Icon: typeof Mic }[] = [
  { mode: "voice", label: "Voice", Icon: Mic },
  { mode: "photo", label: "Photos", Icon: ImageIcon },
  { mode: "text", label: "Text", Icon: Type },
];

/**
 * "Add what you remember." — the contributor's form.
 *
 * Everything here works without an account, and it has to: the people with the
 * most to say about someone are often the least willing to sign up for
 * anything. The link is the whole credential.
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

  const attachments = useAttachments(["text"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

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
    Shown only when they change a name that was already stored, because that is
    the only case where anything already sent is affected.

    `useWatch` rather than `form.watch()`: the latter returns a fresh function
    each render, which the React Compiler cannot memoize, so it bails out of
    optimising this whole component. Same value, one that can be tracked.
  */
  const typedName = useWatch({ control: form.control, name: "display_name" });
  const renaming = Boolean(knownName) && typedName.trim() !== knownName;

  const busy = isUploading || submit.isPending;

  function toggle(mode: Mode) {
    // The text lives in react-hook-form, not in the hook, so this component
    // clears it when its section is switched off.
    if (mode === "text" && attachments.isActive("text")) {
      form.setValue("body_text", "");
    }
    attachments.toggle(mode);
  }

  async function onSubmit(values: ContributionFormValues) {
    setProblem(null);
    setJustAdded(false);

    // Only text from a lit section counts — a paragraph typed and then
    // switched off should not be submitted.
    const body = attachments.isActive("text")
      ? (values.body_text?.trim() ?? "")
      : "";

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
        participant_token: participantToken,
      });

      form.setValue("body_text", "");
      attachments.reset(["text"]);
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
    <div className="space-y-8">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
        <fieldset className="space-y-3" disabled={busy}>
          <legend className="sr-only">
            What would you like to add? Choose any.
          </legend>
          <div className="grid grid-cols-3 gap-4">
            {MODES.map(({ mode, label, Icon }) => {
              const on = attachments.isActive(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggle(mode)}
                  aria-pressed={on}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    on
                      ? "border-seal bg-seal-wash"
                      : "border-border bg-paper-deep hover:border-ink-faint"
                  }`}
                >
                  <Icon aria-hidden className="mb-2 size-5 text-seal" />
                  <p className="font-sans text-sm font-medium">{label}</p>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/*
          The promise this page makes, stated before anything is typed rather
          than in a footer nobody reads. It is also true: the backend gives a
          contributor no way to read the archive.
        */}
        <div className="rounded-lg border border-border bg-paper-deep p-4">
          <p className="font-sans text-sm font-medium">
            A small note before you begin
          </p>
          <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">
            What you add is shared with {invitation.invited_by || "the family"}.
            You will not see the archive or anyone else&apos;s memories, and you
            do not need an account. Anything you record is written out
            automatically by a transcription service, so the family can read it
            as well as hear it.
          </p>
        </div>

        {attachments.isActive("voice") && (
          <VoiceRecorder
            recordings={attachments.recordings}
            onRecorded={attachments.addRecording}
            onRemoved={attachments.removeRecording}
            disabled={busy}
          />
        )}

        {attachments.isActive("photo") && (
          <PhotoPicker
            photos={attachments.photos}
            onPicked={attachments.addPhotos}
            onRemoved={attachments.removePhoto}
            disabled={busy}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="display_name">Your name</Label>
          <Input
            id="display_name"
            placeholder="So the family knows who this is from"
            className="max-w-sm"
            disabled={busy}
            {...form.register("display_name")}
          />
          {form.formState.errors.display_name && (
            <p className="font-sans text-sm text-seal">
              {form.formState.errors.display_name.message}
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
            <p className="font-sans text-sm text-ink-soft">
              This also updates the name shown on what you have already added.
            </p>
          )}
        </div>

        {attachments.isActive("text") && (
          <div className="space-y-2">
            <Label htmlFor="body_text">Your recollection</Label>
            <Textarea
              id="body_text"
              placeholder="Start with the detail you remember most clearly…"
              disabled={busy}
              {...form.register("body_text")}
            />
          </div>
        )}

        {problem && (
          <p role="alert" className="font-sans text-sm text-seal">
            {problem}
          </p>
        )}

        {justAdded && (
          <p role="status" className="font-sans text-sm text-seal">
            Added. Thank you — you can leave another if more comes back to you.
          </p>
        )}

        <div className="flex justify-center">
          <Button type="submit" disabled={busy}>
            <Plus aria-hidden />
            {isUploading
              ? "Uploading…"
              : submit.isPending
                ? "Adding…"
                : "Add to memoir"}
          </Button>
        </div>
      </form>

      {mine && mine.length > 0 && (
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="font-heading text-xl font-normal">
            What you have added
          </h2>
          <ul className="space-y-3">
            {mine.map((memory) => (
              <li
                key={memory.id}
                className="space-y-3 rounded-lg border border-border bg-paper-deep p-4"
              >
                <p className="eyebrow-muted">
                  {memory.kind === "voice"
                    ? "Voice note"
                    : memory.kind === "photo"
                      ? "Photograph"
                      : "Written"}
                </p>
                {memory.body_text && (
                  <p className="font-sans text-sm leading-relaxed">
                    {memory.body_text}
                  </p>
                )}

                {/* Every asset, not just the first — one contribution can now
                    carry several photographs and several recordings. */}
                {memory.assets
                  .filter((asset) => asset.kind === "audio" && asset.url)
                  .map((asset) => (
                    <div key={asset.id} className="space-y-2">
                      <audio controls src={asset.url ?? ""} className="w-full" />
                      <TranscriptReader transcript={asset.transcript} />
                    </div>
                  ))}

                {memory.assets.some(
                  (asset) => asset.kind === "image" && asset.url,
                ) && (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                            className="h-28 w-full rounded object-cover"
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
    </div>
  );
}
