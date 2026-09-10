/**
 * Helpers for the contributors screen. Pure functions, no React.
 *
 * They live in the feature rather than `src/utils/` because each encodes a
 * product decision — what counts as a possible duplicate, how a relationship
 * reads — rather than being generic string work.
 */

import type { Contributor } from "@/features/contributors/schemas";

/**
 * Names that are the same name for the purpose of spotting a duplicate.
 *
 * Case-folded and trimmed, because `"Ali"`, `"ali"` and `"ALI "` are one
 * person typing on three keyboards. Nothing anywhere else in the product
 * compares names — identity is a token — so this normalisation exists only to
 * decide what to *ask the owner about*, never to decide anything itself.
 */
function normalise(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Contributors who share a name, grouped, most memories first within a group.
 *
 * A group is a **question, not an answer.** Two cousins called Ali are two
 * people, and the whole reason this returns groups rather than performing
 * merges is that no rule available here could tell them apart. The owner can.
 *
 * The owner is never included: they arrive through signup rather than the
 * link, there is exactly one of them, and they cannot be a duplicate of
 * anybody.
 *
 * Groups of one are dropped — there is nothing to ask about a name only one
 * person is using.
 */
export function duplicateGroups(participants: Contributor[]): Contributor[][] {
  const byName = new Map<string, Contributor[]>();

  for (const person of participants) {
    if (person.role === "owner") continue;

    const key = normalise(person.display_name);
    if (!key) continue;

    const group = byName.get(key);
    if (group) {
      group.push(person);
    } else {
      byName.set(key, [person]);
    }
  }

  return [...byName.values()]
    .filter((group) => group.length > 1)
    .map((group) =>
      // Most memories first, so the default "keep this one" is the entry with
      // the most behind it — the fewest rows to move and the least to lose if
      // the owner changes their mind about which is which.
      [...group].sort((a, b) => b.memory_count - a.memory_count),
    );
}

/**
 * What one person's presence in the memoir amounts to, in a phrase.
 *
 * Three genuinely different states, and the middle one is the whole reason the
 * contributors screen exists: somebody opened the link and did not write
 * anything. That is a person to ring, not a number to chase — so it is stated
 * plainly and given no badge, no counter, and no reminder button.
 */
export function describeContribution(person: Contributor): string {
  if (person.memory_count > 0) {
    return person.memory_count === 1
      ? "1 memory"
      : `${person.memory_count} memories`;
  }
  if (person.first_opened_at) return "Opened, nothing yet";
  return "Has not opened the link";
}

export function relationshipOf(person: Contributor): string {
  if (person.relationship_label?.trim()) return person.relationship_label;
  if (person.role === "owner") return "Owner";
  if (person.relationship === "other") return "Contributor";
  return person.relationship.replaceAll("_", " ");
}

/** Somebody who has left nothing. Their row fades rather than gaining a badge. */
export function isPending(person: Contributor): boolean {
  return person.memory_count === 0;
}

export type ContributorRun = {
  key: "added" | "quiet" | "unopened";
  label: string;
  people: Contributor[];
};

/**
 * The three states, grouped, because "who has not answered" is the question the
 * owner opens this page with — and it used to be right-aligned grey text on row
 * six of a flat list.
 *
 * Derived entirely from `Contributor`; no new endpoint, no invite list. Note
 * what is deliberately **not** here: any count of people "sent" the link. There
 * is one link for everyone and a participant row only exists once somebody
 * arrives, so a number of invitations is not something this product knows. The
 * link's own `open_count` is the honest version of that sentence.
 *
 * Empty runs are dropped — a heading over nothing is worse than silence.
 */
export function contributorRuns(participants: Contributor[]): ContributorRun[] {
  const runs: ContributorRun[] = [
    {
      key: "added",
      label: "Have added something",
      people: participants.filter((p) => p.memory_count > 0),
    },
    {
      key: "quiet",
      label: "Opened it, wrote nothing",
      people: participants.filter(
        (p) => p.memory_count === 0 && p.first_opened_at !== null,
      ),
    },
    {
      key: "unopened",
      label: "Have not opened the link",
      people: participants.filter(
        (p) => p.memory_count === 0 && p.first_opened_at === null,
      ),
    },
  ];

  return runs.filter((run) => run.people.length > 0);
}
