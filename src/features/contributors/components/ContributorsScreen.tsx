"use client";

import Link from "next/link";
import { Merge } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveMemoir } from "@/features/account";
import {
  useContributors,
  useMergeContributors,
  useReissueLink,
} from "@/features/contributors/hooks";
import type { Contributor } from "@/features/contributors/schemas";
import { duplicateGroups } from "@/features/contributors/utils";
import { useTransientLabel } from "@/hooks/useTransientLabel";

const subscribeToNothing = () => () => {};

/**
 * What one person's presence in the memoir amounts to, in a phrase.
 *
 * Three genuinely different states, and the middle one is the whole reason
 * this screen exists: somebody opened the link and did not write anything.
 * That is a person to ring, not a number to chase — so it is stated plainly
 * and given no badge, no counter, and no reminder button.
 */
function describe(person: Contributor): string {
  if (person.memory_count > 0) {
    return person.memory_count === 1
      ? "1 memory"
      : `${person.memory_count} memories`;
  }
  if (person.first_opened_at) return "Opened, nothing yet";
  return "Has not opened the link";
}

function relationshipOf(person: Contributor): string {
  if (person.relationship_label?.trim()) return person.relationship_label;
  if (person.role === "owner") return "Owner";
  if (person.relationship === "other") return "Contributor";
  return person.relationship.replaceAll("_", " ");
}

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
    <div className="space-y-2 border-t border-rule pt-4">
      <p className="font-sans text-sm">
        <span className="font-medium">{keeping.display_name}</span>
        <span className="text-ink-soft"> · {describe(keeping)}</span>
      </p>

      {others.map((other) => (
        <div
          key={other.id}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="font-sans text-sm text-ink-soft">
            and another with {describe(other).toLowerCase()}
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

export function ContributorsScreen() {
  const { memoir } = useActiveMemoir();
  const { data, isPending } = useContributors(memoir?.id ?? null);
  const reissue = useReissueLink(memoir?.id ?? null);
  const merge = useMergeContributors(memoir?.id ?? null);

  const duplicates = duplicateGroups(data?.participants ?? []);

  const [copyLabel, showCopyLabel] = useTransientLabel("Copy link");
  const [confirming, setConfirming] = useState(false);

  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  const link = data?.link ?? null;
  const inviteUrl = link ? `${origin}/j/${link.token}` : null;

  function copyLink() {
    if (!inviteUrl) return;
    const done = () => showCopyLabel("Copied", 1800);
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

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Contributors"
        title="Everyone who remembers."
        description="The people you have invited, what they have added, and the single link that let them in."
      />

      <section className="space-y-4">
        <p className="eyebrow">The link to share</p>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-paper-deep px-5 py-4">
          <code className="min-w-48 flex-1 font-mono text-sm break-all">
            {inviteUrl
              ? inviteUrl.replace(/^https?:\/\//, "")
              : isPending
                ? "Fetching your link…"
                : "No live link. Issue a new one below."}
          </code>
          <Button variant="outline" onClick={copyLink} disabled={!inviteUrl}>
            {copyLabel}
          </Button>
        </div>

        {link && (
          <p className="font-sans text-sm text-muted-foreground">
            {/* A fact, stated once. Not a target and not next to a goal. */}
            Opened {link.open_count === 1 ? "once" : `${link.open_count} times`}.
          </p>
        )}

        <Separator />

        {confirming ? (
          <div className="space-y-3 rounded-lg border border-seal bg-seal-wash p-5">
            <p className="font-sans text-sm leading-relaxed">
              Issuing a new link kills this one immediately. Anyone still
              holding the old address — including people who meant to
              contribute later — will not be able to get in, and you will need
              to send the new link to everybody again.
            </p>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Nothing already contributed is affected.
            </p>
            <div className="flex flex-wrap gap-3">
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
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Revoke and issue a new link
            </Button>
            <p className="font-sans text-xs text-ink-faint">
              If the link has travelled further than you meant it to.
            </p>
          </div>
        )}

        {reissue.error && (
          <p role="alert" className="font-sans text-sm text-seal">
            The link could not be reissued. {reissue.error.message}
          </p>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="font-heading text-2xl font-normal">In this memoir</h2>

        {isPending ? (
          <p className="font-sans text-sm text-ink-faint">Looking…</p>
        ) : (
          <ul className="border-t border-border">
            {data?.participants.map((person) => (
              <li key={person.id} className="border-b border-border">
                {/*
                  A link now, not an inert row. "Who is in this memoir" and
                  "what did they leave" are different questions, and the second
                  one had no answer anywhere in the product — which is the one
                  the owner actually has when an unfamiliar name appears.
                */}
                <Link
                  href={`/contributors/${person.id}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4 transition-colors hover:text-seal"
                >
                  <span className="flex-1 font-heading text-lg">
                    {person.display_name}
                  </span>
                  <span className="eyebrow-muted">{relationshipOf(person)}</span>
                  <span
                    className={`min-w-32 text-right font-sans text-sm ${
                      person.memory_count > 0 ? "text-ink-soft" : "text-ink-faint"
                    }`}
                  >
                    {describe(person)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
          <div className="space-y-4 rounded-lg border border-seal bg-seal-wash p-5">
            <div>
              <p className="font-sans text-sm font-medium text-seal">
                {duplicates.length === 1
                  ? "One name appears twice"
                  : `${duplicates.length} names appear more than once`}
              </p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-ink-soft">
                Usually this is one person who opened the link on a second
                device. Sometimes it is two people who share a name — so nothing
                is combined unless you say so.
              </p>
            </div>

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

            {merge.error && (
              <p role="alert" className="font-sans text-sm text-seal">
                Those could not be combined. {merge.error.message}
              </p>
            )}
          </div>
        )}

        <p className="font-sans text-xs leading-relaxed text-ink-faint">
          Contributors never make an account. They are recognised by the link
          they were sent, which is why the same person can add something today
          and something more next week.
        </p>
      </section>
    </div>
  );
}
