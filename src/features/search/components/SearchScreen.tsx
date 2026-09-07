"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";

import { useSearch, type SearchSource } from "@/features/search/hooks";
import type { SearchHit, SearchKind } from "@/features/search/schemas";
import {
  KIND_LABELS,
  KIND_NAMES,
  KIND_ORDER,
  highlight,
} from "@/features/search/utils";
import { cn } from "@/lib/utils";

/**
 * Finding one afternoon in a life.
 *
 * One screen for two people. The owner reaches it from the archive and a
 * family member from inside the book; they search the same corpus and get the
 * same answer, so there is one component and `SearchSource` carries the
 * difference. A second, cut-down version for the family is how one of them
 * quietly starts returning less than the other.
 *
 * Filtering is done here, over rows already fetched, rather than by asking the
 * backend again with a kind. The counts and the results are then the same
 * rows by construction — a filter that says 1 and shows 0 is the kind of thing
 * that makes a family stop trusting a page.
 */
export function SearchScreen({
  source,
  backHref,
  backLabel,
  chapterHref,
  subjectName,
}: {
  source: SearchSource;
  backHref: string;
  backLabel: string;
  /** Where a hit in the book goes. Null when the reader is not reachable. */
  chapterHref: ((chapterId: string) => string) | null;
  subjectName: string | null;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchKind | null>(null);

  const { data, isFetching } = useSearch(source, query);

  const hits = useMemo(
    () => (data?.hits ?? []).filter((hit) => !kind || hit.kind === kind),
    [data, kind],
  );

  const asked = query.trim().length >= 2;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {backLabel}
        </Link>

        <h1 className="mt-5 font-heading text-3xl leading-tight font-normal tracking-tight">
          Search memories &amp; stories
        </h1>
        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          Every story, photograph, recording and reflection
          {subjectName ? ` about ${subjectName}` : ""} — searched together,
          because nobody remembers which of the four a thing was.
        </p>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* The box                                                       */}
      {/* ------------------------------------------------------------ */}
      <div className="relative max-w-xl">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          placeholder="A place, a name, a thing somebody said…"
          aria-label="Search this memoir"
          className="w-full rounded-full border border-input bg-card py-3.5 pr-11 pl-11 font-sans text-sm text-foreground placeholder:text-ink-faint focus:border-seal focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear the search"
            className="absolute top-1/2 right-4 -translate-y-1/2 text-ink-faint transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* The filters, and then what was found                          */}
      {/* ------------------------------------------------------------ */}
      {asked && data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              label={`Everything (${data.total})`}
              active={kind === null}
              onClick={() => setKind(null)}
            />
            {KIND_ORDER.map((option) => {
              const count = data.counts[option] ?? 0;
              return (
                <Chip
                  key={option}
                  label={`${KIND_LABELS[option]} (${count})`}
                  active={kind === option}
                  muted={count === 0}
                  onClick={() => setKind(count === 0 ? null : option)}
                />
              );
            })}
          </div>

          <p className="font-sans text-sm text-ink-soft">
            {data.total === 0 ? (
              <>
                Nothing matches <Quoted>{data.query}</Quoted>. A memoir holds
                what people happened to say — the thing you are looking for may
                be there under another word.
              </>
            ) : (
              <>
                {hits.length} of {data.total} for <Quoted>{data.query}</Quoted>
                {isFetching && <span className="text-ink-faint"> · looking…</span>}
              </>
            )}
          </p>

          <ul className="space-y-4">
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <Result hit={hit} chapterHref={chapterHref} />
              </li>
            ))}
          </ul>
        </>
      )}

      {!asked && (
        <p className="font-sans text-sm text-ink-faint">
          Two letters is enough to start.
        </p>
      )}
    </div>
  );
}

function Quoted({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-heading text-base italic text-foreground">
      “{children}”
    </span>
  );
}

function Chip({
  label,
  active,
  muted,
  onClick,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 font-sans text-xs transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-input bg-card text-ink-soft hover:text-foreground",
        muted && !active && "opacity-50",
      )}
    >
      {label}
    </button>
  );
}

/**
 * One hit.
 *
 * A story or a reflection links into the book; a photograph or a recording
 * that never made it into a chapter does not, and says nothing rather than
 * offering a link that would go nowhere.
 */
function Result({
  hit,
  chapterHref,
}: {
  hit: SearchHit;
  chapterHref: ((chapterId: string) => string) | null;
}) {
  const href =
    hit.chapter_id && chapterHref ? chapterHref(hit.chapter_id) : null;

  const body = (
    <article className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ink-faint">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="eyebrow">{KIND_NAMES[hit.kind]}</p>
        {hit.year && <p className="eyebrow-muted">{hit.year}</p>}
      </div>

      <h2 className="mt-2 font-heading text-lg leading-snug font-normal">
        {hit.title}
      </h2>

      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
        {highlight(hit.excerpt).map((run, index) =>
          run.match ? (
            <mark
              key={index}
              className="rounded-sm bg-accent px-0.5 text-accent-foreground"
            >
              {run.text}
            </mark>
          ) : (
            <span key={index}>{run.text}</span>
          ),
        )}
      </p>

      {hit.attribution && (
        <p className="mt-3 font-sans text-xs text-ink-faint">
          Given by {hit.attribution}
        </p>
      )}
    </article>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
