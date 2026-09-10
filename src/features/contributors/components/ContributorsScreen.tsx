"use client";

import { Merge, UserPlus } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { PeopleList } from "@/features/contributors/components/PeopleList";
import {
  useContributors,
  useMergeContributors,
  useReissueLink,
} from "@/features/contributors/hooks";
import type { Contributor } from "@/features/contributors/schemas";
import {
  contributorRuns,
  describeContribution,
  duplicateGroups,
} from "@/features/contributors/utils";
import { useTransientLabel } from "@/hooks/useTransientLabel";

const subscribeToNothing = () => () => {};

/**
 * One group of same-named entries, with a merge for each of the extras.
 *
 * The first is the one to keep — `duplicateGroups` sorts by memory count, so
 * the default keeps whichever has the most behind it and moves the fewest rows.
 * Every other entry gets its own explicit "combine into" action rather than a
 * single "merge all", because each is a separate judgement about a separate
 * person.
 */
function DuplicateGroup({
  group,
  onMerge,
  busy,
}: {
  group: Contributor[];
  onMerge: (loserId: string, winnerId: string) => void;
  busy: boolean;
}) {
  const [keeping, ...others] = group;

  return (
    <div className="border-t border-border pt-4">
      {others.map((other) => (
        <div
          key={other.id}
          className="flex flex-wrap items-baseline justify-between gap-4 py-1.5"
        >
          <p className="font-sans text-[13px] text-muted-foreground">
            <span className="font-heading text-[17px] text-foreground">
              {keeping.display_name}
            </span>{" "}
            &middot; {describeContribution(keeping).toLowerCase()}, and another
            with {describeContribution(other).toLowerCase()}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onMerge(other.id, keeping.id)}
          >
            <Merge aria-hidden />
            Same person
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * "Everyone who remembers." — people first, link management last.
 *
 * The three runs are the point. "Has not opened the link" used to be
 * right-aligned grey text on row six of a flat list, and it is the question an
 * owner actually opens this page with: who is missing. Grouping answers it
 * without a badge, a counter or a reminder button — the middle run is a set of
 * people to ring, not a funnel to optimise.
 *
 * The link box and revoke sit at the bottom under a rule. They are maintenance,
 * not the subject of the page, and they used to be the first thing on it.
 */
export function ContributorsScreen() {
  const { memoir } = useActiveMemoir();
  const { data, isPending } = useContributors(memoir?.id ?? null);
  const reissue = useReissueLink(memoir?.id ?? null);
  const merge = useMergeContributors(memoir?.id ?? null);

  const participants = data?.participants ?? [];
  const runs = contributorRuns(participants);
  const duplicates = duplicateGroups(participants);

  const [copyLabel, showCopyLabel] = useTransientLabel("Copy");
  const [headerCopyLabel, showHeaderCopyLabel] = useTransientLabel(
    "Copy the invite link",
  );
  const [confirming, setConfirming] = useState(false);

  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  const link = data?.link ?? null;
  const inviteUrl = link ? `${origin}/j/${link.token}` : null;

  function copyLink(show: (label: string, ms: number) => void) {
    if (!inviteUrl) return;
    const done = () => show("Copied", 1800);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(done, done);
    } else {
      done();
    }
  }

  async function confirmReissue() {
    await reissue.mutateAsync();
    setConfirming(false);
  }

  /*
    What the page can honestly say about who is where.

    Note what it does not say: how many people were *invited*. There is one link
    for everyone and a participant row only exists once somebody arrives, so a
    count of invitations is not something this product knows. The link's own
    `open_count` is the honest version of that sentence.
  */
  const added = runs.find((run) => run.key === "added")?.people.length ?? 0;
  const quiet = runs.find((run) => run.key === "quiet")?.people.length ?? 0;

  const summary = isPending
    ? "Looking…"
    : participants.length === 0
      ? "Nobody has opened the link yet. Nothing is wrong — waiting is the normal state of this."
      : [
          added === 0
            ? "Nobody has written anything yet"
            : added === 1
              ? "One person has written something"
              : `${added} people have written something`,
          quiet > 0 &&
            (quiet === 1
              ? "one opened it and left nothing"
              : `${quiet} opened it and left nothing`),
        ]
          .filter(Boolean)
          .join(", ") + ".";

  return (
    <>
      <PageHeader
        eyebrow="Contributors"
        title="Everyone who remembers."
        description={summary}
        action={
          <Button
            onClick={() => copyLink(showHeaderCopyLabel)}
            disabled={!inviteUrl}
          >
            <UserPlus aria-hidden />
            {headerCopyLabel}
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-10">
        {/* ---------------------------------------------------------- */}
        {/* Three runs, because "who has not answered" is the question  */}
        {/* ---------------------------------------------------------- */}
        {isPending ? (
          <p className="font-sans text-sm text-ink-faint">Looking…</p>
        ) : (
          runs.map((run) => (
            <section key={run.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink pb-2.5">
                <h2
                  className={`font-heading text-[21px] font-normal tracking-tight ${
                    run.key === "added"
                      ? ""
                      : run.key === "quiet"
                        ? "text-muted-foreground"
                        : "text-ink-faint"
                  }`}
                >
                  {run.label}
                </h2>
                <span className="eyebrow-muted">
                  {run.key === "quiet"
                    ? "Worth a phone call, not a reminder"
                    : run.people.length === 1
                      ? "One person"
                      : `${run.people.length} people`}
                </span>
              </div>
              {/*
                A link, not an inert row. "Who is in this memoir" and "what did
                they leave" are different questions, and the second one had no
                answer anywhere in the product — which is the one the owner
                actually has when an unfamiliar name appears.
              */}
              <PeopleList
                people={run.people}
                href={(person) => `/contributors/${person.id}`}
              />
            </section>
          ))
        )}

        {/*
          Possible duplicates, and only ever as a question.

          The same person on a phone and a laptop is two entries, because a
          contributor is recognised by a token in one browser and there is no
          account to tie them together. But two cousins called Ali are two
          people, so nothing here merges on its own — this asks, and the owner,
          who knows their own family, answers.
        */}
        {duplicates.length > 0 && (
          <section className="border border-seal px-6 py-5">
            <p className="font-heading text-[17px] font-normal">
              {duplicates.length === 1
                ? "One name appears twice"
                : `${duplicates.length} names appear more than once`}
            </p>
            <p className="mt-2.5 max-w-[74ch] font-sans text-[13px] leading-relaxed text-muted-foreground">
              Usually this is one person who opened the link on a second device.
              Sometimes it is two people who share a name — so nothing is
              combined unless you say so.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {duplicates.map((group) => (
                <DuplicateGroup
                  key={group[0].id}
                  group={group}
                  onMerge={(loserId, winnerId) =>
                    merge.mutate({ loserId, winnerId })
                  }
                  busy={merge.isPending}
                />
              ))}
            </div>

            {merge.error && (
              <p role="alert" className="mt-3 font-sans text-sm text-seal">
                Those could not be combined. {merge.error.message}
              </p>
            )}
          </section>
        )}

        {/* ---------------------------------------------------------- */}
        {/* Demoted. Maintenance, not the subject of the page.          */}
        {/* ---------------------------------------------------------- */}
        <section className="grid gap-10 border-t border-border pt-7 md:grid-cols-2">
          <div>
            <p className="eyebrow">The link that let them in</p>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3.5 border border-border bg-paper-deep py-3.5 pr-3.5 pl-5">
              <span className="min-w-0 font-sans text-[13.5px] break-all">
                {inviteUrl
                  ? inviteUrl.replace(/^https?:\/\//, "")
                  : isPending
                    ? "Fetching your link…"
                    : "No live link. Issue a new one."}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyLink(showCopyLabel)}
                disabled={!inviteUrl}
              >
                {copyLabel}
              </Button>
            </div>

            <p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
              {/* A fact, stated once. Not a target and not next to a goal. */}
              {link &&
                `Opened ${link.open_count === 1 ? "once" : `${link.open_count} times`}. `}
              Contributors never make an account — they are recognised by the
              link they were sent, which is why the same person can add
              something today and something more next week.
            </p>
          </div>

          <div>
            <p className="eyebrow">If it has travelled too far</p>

            {confirming ? (
              <div className="mt-3.5">
                <p className="max-w-[46ch] font-sans text-[13px] leading-relaxed">
                  Issuing a new link kills this one immediately. Anyone still
                  holding the old address — including people who meant to
                  contribute later — will not be able to get in, and you will
                  need to send the new link to everybody again.
                </p>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-muted-foreground">
                  Nothing already contributed is affected.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={confirmReissue} disabled={reissue.isPending}>
                    {reissue.isPending ? "Issuing…" : "Issue a new link"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirming(false)}
                    disabled={reissue.isPending}
                  >
                    Keep the current link
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-3.5 max-w-[46ch] font-sans text-[13px] leading-relaxed text-muted-foreground">
                  Issuing a new link kills this one immediately. Anyone still
                  holding the old address will not be able to get in. Nothing
                  already contributed is affected.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="mt-4 border-b border-border pb-0.5 font-sans text-[13px] text-muted-foreground transition-colors hover:text-seal"
                >
                  Revoke and issue a new link
                </button>
              </>
            )}

            {reissue.error && (
              <p role="alert" className="mt-3 font-sans text-sm text-seal">
                The link could not be reissued. {reissue.error.message}
              </p>
            )}
          </div>
        </section>
      </PageBody>
    </>
  );
}
