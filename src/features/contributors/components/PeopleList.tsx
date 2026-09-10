import Link from "next/link";

import type { Contributor } from "@/features/contributors/schemas";
import {
  describeContribution,
  isPending,
  relationshipOf,
} from "@/features/contributors/utils";
import { cn } from "@/lib/utils";

/**
 * Everyone who remembers, as hairline rows rather than cards.
 *
 * Three columns on one baseline — name, relationship, what they have left —
 * per `docs/DESIGN-SYSTEM.md` §7. A row that has contributed nothing drops both
 * name and state to `--ink-faint`, so **absence reads as a fade rather than a
 * badge**. That is the whole point: this is a list of people, half of whom are
 * grieving and have not got round to it, and a red "0" beside a name would be
 * the wrong product.
 *
 * `href` is a function rather than a flag because the archive shows the same
 * rows without linking anywhere — there is a "All contributors" link above them
 * instead, and six rows each linking to their own page is six decisions where
 * the page wanted one.
 */
export function PeopleList({
  people,
  href,
  className,
}: {
  people: Contributor[];
  href?: (person: Contributor) => string;
  className?: string;
}) {
  return (
    <ul className={cn("border-t border-border", className)}>
      {people.map((person) => {
        const faded = isPending(person);

        const row = (
          <>
            <span
              className={cn(
                "min-w-0 flex-1 font-heading text-[17px] font-light",
                faded && "text-ink-faint",
              )}
            >
              {person.display_name}
            </span>
            <span className="eyebrow-muted shrink-0 tracking-[0.15em]">
              {relationshipOf(person)}
            </span>
            <span
              className={cn(
                "shrink-0 text-right font-sans text-xs sm:min-w-[92px]",
                faded ? "text-ink-faint" : "text-muted-foreground",
              )}
            >
              {describeContribution(person)}
            </span>
          </>
        );

        return (
          <li key={person.id} className="border-b border-border">
            {href ? (
              <Link
                href={href(person)}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-[15px] transition-colors hover:text-seal"
              >
                {row}
              </Link>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-[15px]">
                {row}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
