"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Mic, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { useCreateMemory } from "@/features/archive/hooks";
import {
  memoryFormSchema,
  type MemoryFormValues,
} from "@/features/archive/schemas";
import {
  DiscardPrompt,
  PhotoPicker,
  VoiceRecorder,
  uploadAll,
  useAttachments,
  type Mode,
} from "@/features/media";

/**
 * What can be added to the writing, and put away again.
 *
 * They are **toggles, not a choice.** Both can be lit at once alongside the
 * text, because an afternoon is often a photograph, a story about it, and
 * someone's voice remembering the rest — and making a person file those as
 * three separate memories is the wrong shape for what they are.
 *
 * **Writing is not in this list.** It is always on: the sheet is the page, and
 * a composer whose writing surface can be switched off is a blank screen with a
 * date picker on it. Every memory can still be photographs or a recording with
 * nothing typed — an empty box saves as no text at all.
 *
 * They are rows in the rail rather than tiles across the page, because they are
 * things *about* the memory rather than things in it. What is in it is the
 * sheet on the left.
 */
const MODES: {
  mode: Extract<Mode, "voice" | "photo">;
  label: string;
  Icon: typeof Mic;
}[] = [
  { mode: "voice", label: "Record your voice", Icon: Mic },
  { mode: "photo", label: "Photographs", Icon: ImageIcon },
];

/**
 * "Begin with what you remember." — the owner's composer.
 *
 * Writing a memory is the most important thing an owner does, and it used to be
 * a 44px title input, a textarea and a date picker at identical weight on the
 * bare ground. It is now one raised sheet written on in Spectral, and a right
 * rail holding everything that is *about* the memory rather than in it.
 *
 * Media is uploaded first and the memory created afterwards, because a file
 * needs somewhere to go before there is a row to attach it to. That ordering is
 * why `onSubmit` below is a sequence rather than one call.
 *
 * `kind` is not sent. The backend derives it from what the memory actually
 * holds — see `_derive_kind` in the API's `memory_service.py`.
 */
export function MemoryComposer() {
  const router = useRouter();
  const { memoir } = useActiveMemoir();
  const create = useCreateMemory(memoir?.id ?? null);

  const attachments = useAttachments(["text"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Which section has been asked about but not yet answered.
   *
   * Turning a section off throws away what was in it and the files exist
   * nowhere else — nothing is uploaded until Save — so a tap that would destroy
   * something asks first. See `useAttachments`.
   */
  const [asking, setAsking] = useState<"photo" | "voice" | null>(null);

  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues: { title: "", body_text: "", happened_on: "" },
  });

  const busy = isUploading || create.isPending;

  /*
    "Saved to Ahmed's archive". A name ending in s takes a bare apostrophe — the
    same rule `archiveTitle()` follows, because it is somebody's grandmother's
    name and getting it wrong is the kind of small carelessness this product
    cannot afford.
  */
  const subject = memoir?.subject_name?.trim();
  const savedTo = subject
    ? `Saved to ${subject}${subject.endsWith("s") ? "’" : "’s"} archive · nothing is published`
    : "Saved to this archive · nothing is published";

  function toggle(mode: Extract<Mode, "voice" | "photo">) {
    // Putting a section out throws away what was in it, and the files exist
    // nowhere else — nothing is uploaded until Save — so a tap that would
    // destroy something asks first. See `useAttachments`.
    if (attachments.isActive(mode) && attachments.holds(mode)) {
      setAsking(mode);
      return;
    }

    setAsking(null);
    attachments.toggle(mode);
  }

  async function onSubmit(values: MemoryFormValues) {
    setProblem(null);

    if (!memoir) {
      setProblem("No memoir is loaded yet. Give it a moment and try again.");
      return;
    }

    // Writing is always on, so there is no lit-section gate here any more. An
    // empty box is simply no text, and the rule below still catches a memory
    // with nothing in it at all.
    const body = values.body_text?.trim() ?? "";

    /*
      One rule now, not three. A memory needs *something* in it — which is the
      same rule the backend enforces (`EmptyMemory` -> 400) and, underneath
      that, the database's `memory_text_has_body`. Said here so the person
      hears it before a round trip rather than after.
    */
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
        { memoirId: memoir.id, credential: { kind: "owner" } },
      );
      setIsUploading(false);

      await create.mutateAsync({
        title: values.title?.trim() || null,
        body_text: body || null,
        happened_on: values.happened_on?.trim() || null,
        asset_ids: assetIds,
      });

      router.push("/archive");
    } catch (error) {
      setIsUploading(false);
      setProblem(
        error instanceof Error
          ? error.message
          : "That could not be saved. Nothing has been lost — try again.",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="New memory"
        title="Begin with what you remember."
        description="Write it, photograph it, or say it out loud — any of the three, or all of them at once. An afternoon is often all three."
      />

      <PageBody>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start"
        >
          {/* ---------------------------------------------------------- */}
          {/* The page you write on                                       */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-lift sm:px-11 sm:pt-9 sm:pb-8">
            <label htmlFor="title" className="eyebrow block">
              Give this a title
            </label>
            {/*
              An underline field, not a boxed input: `docs/DESIGN-SYSTEM.md` §5.
              The `<Input>` primitive is a bordered box by design and is right
              everywhere else in the app — on the sheet it would draw a box
              around the one thing that should read as writing.
            */}
            <input
              id="title"
              placeholder="A name for this moment"
              disabled={busy}
              {...form.register("title")}
              className="mt-2.5 block w-full border-0 border-b border-ink bg-transparent pb-2 font-heading text-[26px] font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:border-seal focus:outline-none disabled:opacity-60"
            />
            {form.formState.errors.title && (
              <p className="mt-2 font-sans text-sm text-seal">
                {form.formState.errors.title.message}
              </p>
            )}

            <label htmlFor="body_text" className="sr-only">
              What happened?
            </label>
            {/* Always here. The sheet is the page — see `MODES` above. */}
            <textarea
              id="body_text"
              rows={9}
              placeholder="Write down the feeling, the details, or simply the first thing you can recall…"
              disabled={busy}
              {...form.register("body_text")}
              className="mt-8 field-sizing-content block min-h-[300px] w-full resize-y border-0 bg-transparent font-heading text-[19px] leading-[1.72] font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:outline-none disabled:opacity-60"
            />

            {attachments.isActive("voice") && (
              <div className="mt-8 border-t border-border pt-6">
                <VoiceRecorder
                  recordings={attachments.recordings}
                  onRecorded={attachments.addRecording}
                  onRemoved={attachments.removeRecording}
                  disabled={busy}
                />
              </div>
            )}

            {attachments.isActive("photo") && (
              <div className="mt-8 border-t border-border pt-6">
                <PhotoPicker
                  photos={attachments.photos}
                  onPicked={attachments.addPhotos}
                  onRemoved={attachments.removePhoto}
                  disabled={busy}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 font-sans text-xs text-ink-faint">
              <span>{savedTo}</span>
              <span>Nobody sees a draft but you</span>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Everything about the memory rather than in it               */}
          {/* ---------------------------------------------------------- */}
          <div className="flex flex-col gap-7">
            <fieldset disabled={busy}>
              <legend className="eyebrow">Add to it</legend>
              <ul className="mt-3.5 border-t border-border">
                {/*
                  Writing is listed but not a control. It is always on, and a
                  row that looks tappable and does nothing is worse than a row
                  that says so — "Always" rather than "On" is the difference.
                */}
                <li className="flex items-center gap-3 border-b border-border py-3.5">
                  <Type aria-hidden className="size-4 text-seal" />
                  <span className="flex-1 font-sans text-[13.5px]">
                    Write it down
                  </span>
                  <span className="font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase">
                    Always
                  </span>
                </li>

                {MODES.map(({ mode, label, Icon }) => {
                  const on = attachments.isActive(mode);
                  const isAsking = asking === mode;

                  return (
                    <li key={mode} className="border-b border-border">
                      <button
                        type="button"
                        onClick={() => toggle(mode)}
                        aria-pressed={on}
                        className="flex w-full items-center gap-3 py-3.5 text-left"
                      >
                        <Icon
                          aria-hidden
                          className={`size-4 ${on ? "text-seal" : "text-ink-faint"}`}
                        />
                        <span
                          className={`flex-1 font-sans text-[13.5px] ${on ? "" : "text-muted-foreground"}`}
                        >
                          {label}
                        </span>
                        <span
                          className={`font-sans text-[9.5px] font-medium tracking-[0.16em] uppercase ${on ? "text-seal" : "text-ink-faint"}`}
                        >
                          {on ? "On" : "Add"}
                        </span>
                      </button>

                      {isAsking && (
                        <div className="pb-4">
                          <DiscardPrompt
                            mode={mode}
                            count={
                              mode === "photo"
                                ? attachments.photos.length
                                : attachments.recordings.length
                            }
                            onKeep={() => setAsking(null)}
                            onRemove={() => {
                              attachments.discard(mode);
                              setAsking(null);
                            }}
                            disabled={busy}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <div>
              <label htmlFor="happened_on" className="eyebrow block">
                When was this
              </label>
              <input
                id="happened_on"
                type="date"
                disabled={busy}
                {...form.register("happened_on")}
                className="mt-3 block w-full border-0 border-b border-ink bg-transparent pb-2 font-heading text-[19px] font-light text-foreground focus:border-seal focus:outline-none disabled:opacity-60"
              />
              <p className="mt-2.5 font-sans text-xs leading-relaxed text-ink-faint">
                Optional. A year is enough for the timeline to place it.
              </p>
              {form.formState.errors.happened_on && (
                <p className="mt-2 font-sans text-sm text-seal">
                  {form.formState.errors.happened_on.message}
                </p>
              )}
            </div>

            {problem && (
              <p role="alert" className="font-sans text-sm text-seal">
                {problem}
              </p>
            )}

            <div className="border-t border-border pt-5">
              <Button type="submit" disabled={busy} className="h-12 w-full">
                {isUploading
                  ? "Uploading…"
                  : create.isPending
                    ? "Saving…"
                    : "Save this memory"}
              </Button>
              <p className="mt-3.5 font-sans text-xs leading-relaxed text-ink-faint">
                Private and unpublished. Nothing is locked until you publish it
                yourself.
              </p>
            </div>
          </div>
        </form>
      </PageBody>
    </>
  );
}
