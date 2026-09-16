"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";

import { PageBody } from "@/components/layout/PageBody";
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
 * It draws its own band and its own page rather than sitting inside somebody
 * else's column, for the same reason: it renders on both sides of the `(app)`
 * boundary, and only one of those has a layout to inherit.
 *
 * Results are a chronological table, not a column of cards. Four rounded cards
 * hid the one thing that orders a life — kind and year now sit in a left
 * column, the excerpt is at reading size, and the contributor is right-aligned,
 * so a scan reads as a timeline.
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
  chapterBase,
  subjectName,
}: {
  source: SearchSource;
  backHref: string;
  backLabel: string;
  /**
   * What a hit in the book links to, minus the chapter id — `/m/{token}`.
   * Null when the reader is not reachable, which is a memoir nobody has
   * published yet.
   *
   * A string rather than a function, and that is not a style choice: the
   * reader's search page is a server component, and a function cannot cross
   * into a client one. It fails at runtime, not at build time, which is
   * exactly the kind of thing a typecheck lets through.
   */
  chapterBase: string | null;
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
  const possessive = subjectName
    ? `${subjectName.split(" ")[0]}${subjectName.split(" ")[0].endsWith("s") ? "’" : "’s"}`
    : null;

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* The band, and the box in it                                   */}
      {/* ------------------------------------------------------------ */}
      <div className="border-b border-border bg-paper-deep">
        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {backLabel}
          </Link>

          <p className="eyebrow mt-5">
            {possessive ? `Search ${possessive} archive` : "Search this memoir"}
          </p>

          {/*
            An underline field, not a pill. `docs/DESIGN-SYSTEM.md` §5: the
            query is the one thing on this page somebody wrote, so it is set at
            reading size in Spectral, and the rule under it is the whole
            control.
          */}
          <div className="mt-3.5 flex items-center gap-3.5 border-b border-ink pb-2.5">
            <Search aria-hidden className="size-4.5 shrink-0 text-seal" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder="A place, a name, a thing somebody said…"
              aria-label="Search this memoir"
              className="min-w-0 flex-1 border-0 bg-transparent font-heading text-[clamp(20px,3vw,26px)] font-light text-foreground placeholder:text-[clamp(16px,2.2vw,20px)] placeholder:font-light placeholder:text-ink-faint placeholder:italic focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear the search"
                className="shrink-0 text-ink-faint transition-colors hover:text-foreground"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </div>

          <p className="mt-3 max-w-[70ch] font-sans text-[13px] leading-relaxed text-muted-foreground">
            Stories, photographs, recordings and reflections
            {subjectName ? ` about ${subjectName}` : ""}, searched together —
            nobody remembers which of the four a thing was.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* The filters, and then what was found                          */}
      {/* ------------------------------------------------------------ */}
      <PageBody className="md:py-10">
        {asked && data ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
                <Filter
                  label={`Everything · ${data.total}`}
                  active={kind === null}
                  onClick={() => setKind(null)}
                />
                {KIND_ORDER.map((option) => {
                  const count = data.counts[option] ?? 0;
                  return (
                    <Filter
                      key={option}
                      label={`${KIND_LABELS[option]} · ${count}`}
                      active={kind === option}
                      muted={count === 0}
                      onClick={() => setKind(count === 0 ? null : option)}
                    />
                  );
                })}
              </div>

              <p className="font-sans text-xs text-ink-faint">
                {data.total === 0
                  ? "Nothing mentions it"
                  : data.total === 1
                    ? "One thing mentions it"
                    : `${data.total} things mention it`}
                {isFetching && " · looking…"}
              </p>
            </div>

            {data.total === 0 ? (
              <p className="mt-7 max-w-[70ch] font-sans text-[13px] leading-relaxed text-muted-foreground">
                Nothing matches <Quoted>{data.query}</Quoted>. A memoir holds
                what people happened to say — the thing you are looking for may
                be there under another word. Try a place, a name, or something
                somebody said.
              </p>
            ) : (
              <>
                <ul className="mt-7 border-t border-ink">
                  {hits.map((hit) => (
                    <li
                      key={`${hit.kind}-${hit.id}`}
                      className="border-b border-border"
                    >
                      <Result hit={hit} chapterBase={chapterBase} />
                    </li>
                  ))}
                </ul>

                <p className="mt-6 max-w-[70ch] font-sans text-[12.5px] leading-relaxed text-ink-faint">
                  A memoir is not a perfect record. If what you are looking for
                  is not here, it may be there under another word.
                </p>
              </>
            )}
          </>
        ) : (
          <p className="font-sans text-sm text-ink-faint">
            Two letters is enough to start.
          </p>
        )}
      </PageBody>
    </>
  );
}

function Quoted({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-heading text-base italic text-foreground">
      &ldquo;{children}&rdquo;
    </span>
  );
}

/**
 * One filter.
 *
 * A tracked-out count rather than a pill, so the row reads as a table header
 * over the results instead of a second set of controls. The active one is
 * underlined in seal — the same "current" mark the header nav uses.
 */
function Filter({
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
        "font-sans text-[10px] font-medium tracking-[0.16em] uppercase transition-colors",
        active
          ? "border-b border-seal pb-1 text-seal"
          : muted
            ? "text-ink-faint"
            : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * One hit, as a row in a chronological table.
 *
 * A story or a reflection links into the book; a photograph or a recording
 * that never made it into a chapter does not, and says nothing rather than
 * offering a link that would go nowhere.
 */
function Result({
  hit,
  chapterBase,
}: {
  hit: SearchHit;
  chapterBase: string | null;
}) {
  const href =
    hit.chapter_id && chapterBase ? `${chapterBase}#${hit.chapter_id}` : null;

  const body = (
    <div className="grid items-baseline gap-5 py-6 sm:grid-cols-[112px_minmax(0,1fr)_150px] sm:gap-7">
      <div>
        <p className="eyebrow">{KIND_NAMES[hit.kind]}</p>
        {hit.year && (
          <p className="mt-2 font-heading text-[17px] font-light text-ink-faint">
            {hit.year}
          </p>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="font-heading text-[20px] leading-snug font-normal text-balance">
          {hit.title}
        </h2>
        <p className="mt-2.5 max-w-[64ch] font-heading text-base leading-[1.7] font-light text-muted-foreground">
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
      </div>

      {hit.attribution && (
        <span className="font-sans text-xs text-ink-faint sm:text-right">
          {hit.attribution}
        </span>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block transition-colors hover:text-seal">
      {body}
    </Link>
  ) : (
    body
  );
}
