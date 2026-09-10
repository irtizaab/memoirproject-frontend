/**
 * Display component for a greeting. A server component — no `"use client"`,
 * no hooks, no data fetching.
 *
 * It receives already-fetched data as props. Fetching happens in the page;
 * this component only decides how the result looks. That split is what makes
 * it reusable from either data path: the page passes server-fetched data here,
 * and `GreetingForm` passes its mutation result to the same component.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GreetingResponse } from "@/features/example/schemas";

type GreetingCardProps = {
  greeting: GreetingResponse;
  title?: string;
  description?: string;
};

export function GreetingCard({
  greeting,
  title,
  description,
}: GreetingCardProps) {
  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <p className="text-lg font-medium">{greeting.message}</p>
        {greeting.error && (
          <p className="mt-2 text-sm text-destructive">{greeting.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
