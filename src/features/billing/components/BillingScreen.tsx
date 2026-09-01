"use client";

import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatBytes } from "@/features/archive";
import { useBilling } from "@/features/billing/hooks";
import { formatPrice } from "@/features/billing/utils";
import { isApiError } from "@/lib/api/errors";

export function BillingScreen() {
  const { data, isPending, error } = useBilling();

  // 404 means the account exists but no memoir has been claimed against it.
  // An ordinary state on the way through onboarding, not a failure.
  const noAccountYet = isApiError(error) && error.status === 404;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Billing"
        title="A home for every remembered thing."
        description="Keep your growing archive safe, shareable, and ready for the years ahead."
      />

      {isPending && (
        <p className="font-sans text-sm text-ink-faint">One moment…</p>
      )}

      {noAccountYet && (
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          There is nothing to bill for yet — no memoir has been created against
          this account.
        </p>
      )}

      {error && !noAccountYet && (
        <p role="alert" className="font-sans text-sm text-seal">
          Your plan could not be loaded. {(error as Error).message}
        </p>
      )}

      {data && (
        <>
          <section className="flex flex-wrap items-start justify-between gap-6 rounded-lg border border-border bg-paper-deep p-6">
            <div className="space-y-2">
              <p className="eyebrow-muted">Current plan</p>
              <h2 className="font-heading text-2xl font-normal">
                {data.plan.name}
              </h2>
              <p className="max-w-md font-sans text-sm leading-relaxed text-muted-foreground">
                {data.plan.tagline}
              </p>
            </div>

            <div className="text-right">
              <p className="font-heading text-4xl leading-none font-normal">
                {formatPrice(data.plan.price_cents, data.plan.currency)}
              </p>
              {/*
                Driven by the plan, not hardcoded. Keepsake bills monthly or
                yearly from two rows that share a name — "per month" beside a
                yearly price would be wrong by a factor of twelve.
              */}
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                per {data.plan.billing_interval}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-heading text-xl font-normal">Archive space</h2>
              <p className="eyebrow-muted">
                {formatBytes(data.storage.used_bytes)} of{" "}
                {formatBytes(data.storage.limit_bytes)}
              </p>
            </div>

            <Meter
              value={data.storage.used_bytes}
              max={data.storage.limit_bytes}
              label={`${formatBytes(data.storage.used_bytes)} of ${formatBytes(
                data.storage.limit_bytes,
              )} used`}
            />

            <p className="font-sans text-sm text-muted-foreground">
              {data.storage.used_bytes === 0
                ? "Nothing stored yet. Voice notes and photographs will appear here."
                : "Plenty of room for the next few decades of stories."}
            </p>
          </section>

          <Separator />

          <section className="flex flex-wrap items-center gap-4">
            {/*
              Disabled, and honest about why. Stripe is not wired up yet, so
              there is no plan to manage and no renewal date to show —
              inventing one would be a lie about money, which is the worst kind
              of placeholder to ship. When payments land, this button gets an
              href and the date gets a source.
            */}
            <Button disabled={!data.payments_enabled}>
              <ArrowRight aria-hidden />
              Manage plan
            </Button>

            <p className="font-sans text-sm text-muted-foreground">
              {data.payments_enabled
                ? data.renews_on
                  ? `Renews on ${new Date(data.renews_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : "No renewal scheduled."
                : "Payments are not switched on yet. Nothing has been charged."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
