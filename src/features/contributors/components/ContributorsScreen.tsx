"use client";

import { useState, useSyncExternalStore } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useActiveMemoir } from "@/features/account";
import { useContributors, useReissueLink } from "@/features/contributors/hooks";
import type { Contributor } from "@/features/contributors/schemas";
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

export function ContributorsScreen() {
  const { memoir } = useActiveMemoir();
  const { data, isPending } = useContributors(memoir?.id ?? null);
  const reissue = useReissueLink(memoir?.id ?? null);

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
              <li
                key={person.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border py-4"
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
              </li>
            ))}
          </ul>
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
