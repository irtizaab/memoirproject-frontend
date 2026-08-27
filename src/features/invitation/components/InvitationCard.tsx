/**
 * What a contributor sees when they open a share link.
 *
 * A server component — no `"use client"`, no hooks, no fetching. It receives
 * already-resolved data as props; the page does the fetching.
 *
 * Scope note: this is deliberately minimal. The prototype
 * (`memoir-onboarding_7.html`) has no contributor screen, so there is no
 * design to port yet — this exists so a shared link resolves to something real
 * instead of a 404, and is the obvious place to build the contribute flow.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Invitation } from "@/features/invitation/schemas";

/**
 * Renders the subject's years the way the memoir does.
 *
 * Three shapes, matching the three states the columns can be in:
 *   1938 – 2021     both years known
 *   1938 – Present  still living
 *   born 1938       no end year recorded, and not marked living
 */
function formatYears(invitation: Invitation): string | null {
  const { born_year, through_year, subject_is_living } = invitation;

  if (born_year && through_year) return `${born_year} – ${through_year}`;
  if (born_year && subject_is_living) return `${born_year} – Present`;
  if (born_year) return `born ${born_year}`;
  if (through_year) return `died ${through_year}`;
  return null;
}

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const years = formatYears(invitation);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {invitation.subject_name}
        </CardTitle>
        {years && <CardDescription>{years}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg">
          <span className="font-medium">{invitation.invited_by}</span> is
          collecting memories of {invitation.subject_name} and would like you
          to add yours.
        </p>
        <p className="text-sm text-muted-foreground">
          You don&apos;t need an account. Nothing you write is public — it goes
          only into this memoir.
        </p>
      </CardContent>
    </Card>
  );
}
