"use client";

import Link from "next/link";
import { ArrowLeft, Mic, Type } from "lucide-react";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import {
  formatHappenedOn,
  labelForKind,
  useMemories,
} from "@/features/archive";
import type { Memory } from "@/features/archive";
import { useContributors } from "@/features/contributors/hooks";
import { relationshipOf } from "@/features/contributors/utils";

/** Roughly three lines at reading size. */
const EXCERPT_LENGTH = 220;

function excerpt(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= EXCERPT_LENGTH) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", EXCERPT_LENGTH))}…`;
}

/** "6 photographs · 1 recording", or "Text only". */
function holdings(memory: Memory): string {
  const photos = memory.assets.filter((asset) => asset.kind === "image").length;
  const recordings = memory.assets.filter(
    (asset) => asset.kind === "audio",
  ).length;

  const parts = [
    photos > 0 && `${photos} ${photos === 1 ? "photograph" : "photographs"}`,
    recordings > 0 &&
      `${recordings} ${recordings === 1 ? "recording" : "recordings"}`,
  ].filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(" · ") : "Text only";
}

/**
 * Everything one person has added, read rather than scanned.
 *
 * The contributors list answers "who is in this memoir". This answers "what did
 * they leave", which is the question the owner actually has when a name they
 * do not recognise appears on the list — and the one the product had no way to
 * answer.
 *
 * A hairline list at reading size, not a two-up grid of tiles. This is one
 * person's whole contribution and it is usually four or five things; a grid
 * asks you to scan them and a list lets you read them.
 *
 * It reads from the archive rather than from a new endpoint. `GET /memoirs/
 * {id}/memories` already returns every memory with the `participant_id` that
 * left it, so this is a filter over data the archive has usually already
 * fetched — the page is typically instant, and there is no second way for the
 * two lists to disagree.
 *
 * Filtered on the id and never on the name. Two people who share a name are two
 * people; that is what the merge flow on the contributors screen is for.
 *
 * Delete is not repeated here. Each row links to the memory itself, where
 * deleting already lives behind a confirm — putting a second delete control on
 * a list is exactly what that page's design deliberately avoided.
 */
export function ContributorMemories({
  participantId,
}: {
  participantId: string;
}) {
  const { memoir } = useActiveMemoir();
  const { data: contributors } = useContributors(memoir?.id ?? null);
  const { data: memories, isPending, error } = useMemories(memoir?.id ?? null);

  const person = contributors?.participants.find(
    (participant) => participant.id === participantId,
  );

  const theirs = (memories ?? []).filter(
    (memory) => memory.participant_id === participantId,
  );

  if (isPending && !memories) {
    return (
      <PageBody>
        <p className="font-sans text-sm text-ink-faint">Opening…</p>
      </PageBody>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          eyebrow="Contributors"
          title="That could not be opened."
          description="Something went wrong reaching the archive. Trying again usually settles it."
        />
        <PageBody>
          <Link
            href="/contributors"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft aria-hidden />
            Back to contributors
          </Link>
        </PageBody>
      </>
    );
  }

  const photographs = theirs.reduce(
    (sum, memory) =>
      sum + memory.assets.filter((asset) => asset.kind === "image").length,
    0,
  );
  const firstOpened = person?.first_opened_at
    ? new Date(person.first_opened_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "—";

  return (
    <>
      <div className="border-b border-border bg-paper-deep">
        <div className="mx-auto w-full max-w-7xl px-6 pt-7 pb-8">
          <Link
            href="/contributors"
            className="inline-flex items-center gap-2 font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Contributors
          </Link>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">
                {person?.role === "owner"
                  ? "You"
                  : person
                    ? relationshipOf(person)
                    : "A contributor"}
              </p>
              <h1 className="mt-3 font-heading text-[clamp(26px,4vw,32px)] leading-tight font-normal tracking-tight">
                {person?.display_name ?? "This contributor"}
              </h1>
            </div>

            {/* Three plain facts, not a scorecard. */}
            <dl className="flex flex-wrap gap-9">
              {[
                { value: String(theirs.length), label: "Memories" },
                { value: String(photographs), label: "Photographs" },
                { value: firstOpened, label: "First opened" },
              ].map((cell) => (
                <div key={cell.label}>
                  <dd className="font-heading text-2xl leading-none font-normal">
                    {cell.value}
                  </dd>
                  <dt className="eyebrow-muted mt-1.5">{cell.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <PageBody>
        {theirs.length > 0 ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-2.5">
              <h2 className="font-heading text-[21px] font-normal tracking-tight">
                What {person?.display_name?.split(" ")[0] ?? "they"} has left
              </h2>
              <span className="eyebrow-muted">Newest first</span>
            </div>

            <ul>
              {theirs.map((memory) => {
                const photo = memory.assets.find(
                  (asset) => asset.kind === "image" && asset.url,
                );
                const Glyph = memory.kind === "voice" ? Mic : Type;

                return (
                  <li key={memory.id} className="border-b border-border">
                    <Link
                      href={`/archive/${memory.id}`}
                      className="grid items-start gap-5 py-6 transition-colors hover:text-seal sm:grid-cols-[112px_minmax(0,1fr)_150px] sm:gap-7"
                    >
                      {photo ? (
                        /* A signed, expiring URL from a private bucket. */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.url ?? ""}
                          alt=""
                          aria-hidden
                          className="h-28 w-full border border-border bg-paper-deep object-cover sm:w-28"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-28 w-full items-center justify-center border border-border bg-paper-deep sm:w-28"
                        >
                          <Glyph className="size-4.5 text-ink-faint" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-3.5">
                          <span className="eyebrow">
                            {labelForKind(memory.kind)}
                          </span>
                          {formatHappenedOn(memory.happened_on) && (
                            <span className="eyebrow-muted">
                              {formatHappenedOn(memory.happened_on)}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2.5 font-heading text-[21px] leading-snug font-normal text-balance">
                          {memory.title ?? "An untitled memory"}
                        </h3>
                        {memory.body_text && (
                          <p className="mt-2.5 max-w-[62ch] font-heading text-base leading-[1.7] font-light text-muted-foreground">
                            {excerpt(memory.body_text)}
                          </p>
                        )}
                      </div>

                      <span className="font-sans text-xs text-ink-faint sm:text-right">
                        {holdings(memory)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="font-heading text-base italic text-muted-foreground">
            They have opened the link. Nothing has arrived yet, and that is a
            normal place for this to sit.
          </p>
        )}
      </PageBody>
    </>
  );
}
