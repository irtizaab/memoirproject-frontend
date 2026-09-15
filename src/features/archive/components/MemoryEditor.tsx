"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import {
  useAttachAssets,
  useMemory,
  useRemoveAsset,
  useUpdateMemory,
} from "@/features/archive/hooks";
import {
  memoryFormSchema,
  type MemoryFormValues,
} from "@/features/archive/schemas";
import {
  PhotoPicker,
  VoiceRecorder,
  uploadAll,
  useAttachments,
} from "@/features/media";
import { isApiError } from "@/lib/api/errors";

/**
 * Editing a memory that already exists.
 *
 * A separate route from the composer rather than a mode inside it. The two look
 * similar and behave differently in the way that matters: everything in the
 * composer is still in the browser and costs nothing to discard, while
 * everything here is already saved and removing it deletes a file somebody
 * cannot get back.
 *
 * That difference drives the two decisions worth knowing:
 *
 *   - **Removing an existing file happens immediately, behind a confirm.** It
 *     is not staged until Save, because a person who removes a photograph and
 *     then closes the tab should not find it still there.
 *   - **New files are attached before the text is saved.** Ordering matters:
 *     someone clearing the words off a text memory *and* adding a photograph in
 *     one edit would otherwise be refused halfway, on the grounds that they had
 *     momentarily emptied it.
 */
export function MemoryEditor({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const { memoir } = useActiveMemoir();
  const {
    data: memory,
    isPending,
    error,
  } = useMemory(memoir?.id ?? null, memoryId);

  const update = useUpdateMemory(memoir?.id ?? null);
  const attach = useAttachAssets(memoir?.id ?? null);
  const remove = useRemoveAsset(memoir?.id ?? null);

  // Newly picked files, not yet uploaded. Both sections start lit, because on
  // this page they are "add more", not "choose what this memory is".
  const additions = useAttachments(["voice", "photo"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingAssetId, setConfirmingAssetId] = useState<string | null>(
    null,
  );

  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues: { title: "", body_text: "", happened_on: "" },
  });

  /*
    Fill the form once the memory arrives.

    `reset` rather than `defaultValues`, because the memory is fetched and this
    component renders before it lands. Keyed on the id so returning to a
    different memory refills rather than keeping the last one's text; guarded on
    `isDirty` so a refetch — the archive polls while a transcript is still being
    written out — cannot overwrite words being typed at that moment.
  */
  const { reset, formState } = form;
  useEffect(() => {
    if (!memory || formState.isDirty) return;
    reset({
      title: memory.title ?? "",
      body_text: memory.body_text ?? "",
      happened_on: memory.happened_on ?? "",
    });
  }, [memory, memoryId, reset, formState.isDirty]);

  const busy =
    isUploading || update.isPending || attach.isPending || remove.isPending;

  if (isPending && !memory) {
    return (
      <p className="font-sans text-sm text-ink-faint">Opening this memory…</p>
    );
  }

  if (error || !memory) {
    const missing = isApiError(error) && error.status === 404;
    return (
      <>
        <PageHeader
          eyebrow="Archive"
          title={
            missing ? "That memory is not here." : "That could not be opened."
          }
          description={
            missing
              ? "It may have been deleted, or the link may belong to a different archive."
              : "Something went wrong reaching the archive. Trying again usually settles it."
          }
        />
        <PageBody>
          <Link
            href="/archive"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft aria-hidden />
            Back to the archive
          </Link>
        </PageBody>
      </>
    );
  }

  const photos = memory.assets.filter((asset) => asset.kind === "image");
  const recordings = memory.assets.filter((asset) => asset.kind === "audio");

  // Read here rather than inside `onSubmit`. The guard above narrows `memory`
  // for the render, but not inside a closure that runs later.
  const existingAssetCount = memory.assets.length;

  /** Turns a failed request into a sentence, with the published case named. */
  function explain(cause: unknown, fallback: string): string {
    if (isApiError(cause) && cause.status === 409) {
      return "This memoir has been published, so it can no longer be changed.";
    }
    return cause instanceof Error ? cause.message : fallback;
  }

  async function removeExisting(assetId: string) {
    setProblem(null);
    try {
      await remove.mutateAsync({ memoryId, assetId });
      setConfirmingAssetId(null);
    } catch (cause) {
      setProblem(
        explain(cause, "That could not be removed. Nothing has been lost."),
      );
    }
  }

  async function onSubmit(values: MemoryFormValues) {
    setProblem(null);

    if (!memoir) {
      setProblem("No memoir is loaded yet. Give it a moment and try again.");
      return;
    }

    const body = values.body_text?.trim() ?? "";

    // Said here so the person hears it before a round trip. The backend
    // enforces the same rule, and the database enforces it under that.
    const willHoldSomething =
      body ||
      existingAssetCount > 0 ||
      additions.photos.length > 0 ||
      additions.recordings.length > 0;

    if (!willHoldSomething) {
      setProblem(
        "A memory needs something in it — a few words, a photograph, or a recording.",
      );
      return;
    }

    try {
      // New files first: uploaded, then adopted. Doing this before the text is
      // saved is what lets someone replace the words with a photograph in one
      // edit without being refused in the middle of it.
      const hasAdditions =
        additions.photos.length > 0 || additions.recordings.length > 0;

      if (hasAdditions) {
        setIsUploading(true);
        const assetIds = await uploadAll(
          [
            ...additions.recordings.map((recording) => ({
              blob: recording.blob,
              kind: "audio" as const,
              durationMs: recording.durationMs,
            })),
            ...additions.photos.map((photo) => ({
              blob: photo.blob,
              kind: "image" as const,
              filename: photo.filename,
            })),
          ],
          { memoirId: memoir.id, credential: { kind: "owner" } },
        );
        setIsUploading(false);
        await attach.mutateAsync({ memoryId, assetIds });
      }

      await update.mutateAsync({
        memoryId,
        title: values.title?.trim() || null,
        body_text: body || null,
        happened_on: values.happened_on?.trim() || null,
      });

      router.push(`/archive/${memoryId}`);
    } catch (cause) {
      setIsUploading(false);
      setProblem(
        explain(cause, "That could not be saved. Nothing has been lost."),
      );
    }
  }

  return (
    <>
      {/* The toolbar. Everything that acts on the memory, above the memory. */}
      <div className="border-b border-border bg-paper-deep">
        <div className="mx-auto w-full max-w-7xl px-6 pt-7 pb-8">
          <Link
            href={`/archive/${memoryId}`}
            className="inline-flex items-center gap-2 font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to this memory
          </Link>

          <p className="eyebrow mt-5">Editing</p>
          <h1 className="mt-3 font-heading text-[clamp(26px,4vw,32px)] leading-tight font-normal tracking-tight text-balance">
            {memory.title ?? "An untitled memory"}
          </h1>
          <p className="mt-2.5 max-w-[62ch] font-sans text-sm leading-relaxed text-muted-foreground">
            Change what was written, or add and remove what came with it.
            Removing a photograph or a recording deletes it.
          </p>
        </div>
      </div>

      <PageBody>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start"
        >
          {/* ---------------------------------------------------------- */}
          {/* The page you write on — the composer's twin                  */}
          {/* ---------------------------------------------------------- */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-lift sm:px-11 sm:pt-9 sm:pb-8">
            <label htmlFor="title" className="eyebrow block">
              Give this a title
            </label>
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
            <textarea
              id="body_text"
              rows={9}
              placeholder="Write down the feeling, the details, or simply the first thing you can recall…"
              disabled={busy}
              {...form.register("body_text")}
              className="mt-8 field-sizing-content block min-h-[300px] w-full resize-y border-0 bg-transparent font-heading text-[19px] leading-[1.72] font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:outline-none disabled:opacity-60"
            />

            {recordings.length > 0 && (
              <section className="mt-8 border-t border-border pt-6">
                <h2 className="eyebrow">
                  {recordings.length === 1
                    ? "The recording already here"
                    : "The recordings already here"}
                </h2>
                <ul className="mt-4 space-y-5">
                  {recordings.map((asset) => (
                    <li key={asset.id} className="space-y-3">
                      <audio
                        controls
                        src={asset.url ?? ""}
                        className="w-full border border-border bg-paper-deep p-2.5"
                      />
                      <ExistingAssetControls
                        kind="recording"
                        confirming={confirmingAssetId === asset.id}
                        busy={busy}
                        onAsk={() => setConfirmingAssetId(asset.id)}
                        onCancel={() => setConfirmingAssetId(null)}
                        onConfirm={() => removeExisting(asset.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {photos.length > 0 && (
              <section className="mt-8 border-t border-border pt-6">
                <h2 className="eyebrow">
                  {photos.length === 1
                    ? "The photograph already here"
                    : "The photographs already here"}
                </h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {photos.map((asset) => (
                    <li key={asset.id} className="space-y-3">
                      {/* A signed, expiring URL from a private bucket. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url ?? ""}
                        alt="A photograph from this memory"
                        className="w-full border border-border bg-paper-deep object-contain"
                      />
                      <ExistingAssetControls
                        kind="photograph"
                        confirming={confirmingAssetId === asset.id}
                        busy={busy}
                        onAsk={() => setConfirmingAssetId(asset.id)}
                        onCancel={() => setConfirmingAssetId(null)}
                        onConfirm={() => removeExisting(asset.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* The rail                                                     */}
          {/* ---------------------------------------------------------- */}
          <div className="flex flex-col gap-7">
            {/*
              Both sections stay lit and there is no toggle here, so none of
              the discard machinery in the composer applies: on this page they
              are "add more", not "choose what this memory is".
            */}
            <section>
              <p className="eyebrow">Add more to it</p>
              <div className="mt-4 space-y-6">
                <VoiceRecorder
                  recordings={additions.recordings}
                  onRecorded={additions.addRecording}
                  onRemoved={additions.removeRecording}
                  disabled={busy}
                />
                <PhotoPicker
                  photos={additions.photos}
                  onPicked={additions.addPhotos}
                  onRemoved={additions.removePhoto}
                  disabled={busy}
                />
              </div>
            </section>

            <div className="border-t border-border pt-5">
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
                <Check aria-hidden />
                {isUploading
                  ? "Uploading…"
                  : update.isPending || attach.isPending
                    ? "Saving…"
                    : "Save changes"}
              </Button>
              <Link
                href={`/archive/${memoryId}`}
                className="mt-3.5 block text-center font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </PageBody>
    </>
  );
}

/**
 * Remove, behind one confirm.
 *
 * Two taps rather than one because this deletes a file. The same reasoning that
 * keeps delete off the archive grid: nobody should destroy a recording by
 * mis-tapping next to it.
 */
function ExistingAssetControls({
  kind,
  confirming,
  busy,
  onAsk,
  onCancel,
  onConfirm,
}: {
  kind: "photograph" | "recording";
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAsk}
        disabled={busy}
        className="text-ink-soft hover:text-seal"
      >
        Remove this {kind}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-sans text-sm text-seal">
        Remove this {kind}? The file is deleted.
      </p>
      <span className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={busy}
        >
          Keep it
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} disabled={busy}>
          Remove
        </Button>
      </span>
    </div>
  );
}
