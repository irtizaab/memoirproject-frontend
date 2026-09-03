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
export function duplicateGroups(
  participants: Contributor[],
): Contributor[][] {
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
