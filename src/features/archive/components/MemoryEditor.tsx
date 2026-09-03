"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ImageIcon, Mic } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PhotoPicker, VoiceRecorder, uploadAll, useAttachments } from "@/features/media";
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
  const { data: memory, isPending, error } = useMemory(memoir?.id ?? null, memoryId);

  const update = useUpdateMemory(memoir?.id ?? null);
  const attach = useAttachAssets(memoir?.id ?? null);
  const remove = useRemoveAsset(memoir?.id ?? null);

  // Newly picked files, not yet uploaded. Both sections start lit, because on
  // this page they are "add more", not "choose what this memory is".
  const additions = useAttachments(["voice", "photo"]);
  const [isUploading, setIsUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingAssetId, setConfirmingAssetId] = useState<string | null>(null);

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

  const busy = isUploading || update.isPending || attach.isPending || remove.isPending;

  if (isPending && !memory) {
    return <p className="font-sans text-sm text-ink-faint">Opening this memory…</p>;
  }

  if (error || !memory) {
    const missing = isApiError(error) && error.status === 404;
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Archive"
          title={missing ? "That memory is not here." : "That could not be opened."}
          description={
            missing
              ? "It may have been deleted, or the link may belong to a different archive."
              : "Something went wrong reaching the archive. Trying again usually settles it."
          }
        />
        <Link href="/archive" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden />
          Back to the archive
        </Link>
      </div>
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
      setProblem(explain(cause, "That could not be saved. Nothing has been lost."));
    }
  }

  return (
    <div className="space-y-10">
      <Link
        href={`/archive/${memoryId}`}
        className="inline-flex items-center gap-2 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to this memory
      </Link>

      <PageHeader
        eyebrow="Editing"
        title={memory.title ?? "An untitled memory"}
        description="Change what was written, or add and remove what came with it. Removing a photograph or a recording deletes it."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="A name for this moment"
            disabled={busy}
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="font-sans text-sm text-seal">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="body_text">What happened?</Label>
          <Textarea
            id="body_text"
            placeholder="Write down the feeling, the details, or simply the first thing you can recall…"
            disabled={busy}
            {...form.register("body_text")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="happened_on">When was this? (optional)</Label>
          <Input
            id="happened_on"
            type="date"
            className="max-w-xs"
            disabled={busy}
            {...form.register("happened_on")}
          />
          {form.formState.errors.happened_on && (
            <p className="font-sans text-sm text-seal">
              {form.formState.errors.happened_on.message}
            </p>
          )}
        </div>

        {recordings.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-normal">
              {recordings.length === 1
                ? "The recording already here"
                : "The recordings already here"}
            </h2>
            <ul className="space-y-3">
              {recordings.map((asset) => (
                <li
                  key={asset.id}
                  className="space-y-3 rounded-lg border border-border bg-paper-deep p-4"
                >
                  <audio controls src={asset.url ?? ""} className="w-full" />
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
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-normal">
              {photos.length === 1
                ? "The photograph already here"
                : "The photographs already here"}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {photos.map((asset) => (
                <li
                  key={asset.id}
                  className="space-y-3 rounded-lg border border-border bg-paper-deep p-3"
                >
                  {/* A signed, expiring URL from a private bucket. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url ?? ""}
                    alt="A photograph from this memory"
                    className="w-full rounded object-contain"
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

        <section className="space-y-6 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <Mic aria-hidden className="size-4 text-seal" />
            <ImageIcon aria-hidden className="size-4 text-seal" />
            <h2 className="font-heading text-lg font-normal">Add more</h2>
          </div>

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
        </section>

        {problem && (
          <p role="alert" className="font-sans text-sm text-seal">
            {problem}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          <Button type="submit" disabled={busy}>
            <Check aria-hidden />
            {isUploading
              ? "Uploading…"
              : update.isPending || attach.isPending
                ? "Saving…"
                : "Save changes"}
          </Button>
          <Link
            href={`/archive/${memoryId}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
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
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Keep it
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} disabled={busy}>
          Remove
        </Button>
      </span>
    </div>
  );
}
