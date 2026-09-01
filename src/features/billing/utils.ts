/**
 * Turning a plan row into the words on a screen.
 *
 * Pure functions over a `Plan`, no React and no I/O, so both the billing
 * screen and onboarding's pricing step render the same price the same way.
 * They used to each own a copy — one reading `/billing`, the other a hardcoded
 * array — and they drifted by five dollars a month before anyone noticed.
 */

import type { Plan } from "@/features/billing/schemas";

/** `300` → `$3`. Whole dollars stay whole — "$3.00" reads like a receipt. */
export function formatPrice(cents: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "";
  const amount = cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

/**
 * The same price, split for the pricing screen's large treatment, where the
 * currency symbol, the number, and the interval are each set differently.
 */
export function priceParts(plan: Plan): {
  symbol: string;
  amount: string;
  per: string;
} {
  const symbol = plan.currency === "USD" ? "$" : "";
  const amount =
    plan.price_cents % 100 === 0
      ? String(plan.price_cents / 100)
      : (plan.price_cents / 100).toFixed(2);

  return { symbol, amount, per: `/${plan.billing_interval}` };
}

/**
 * The line under the price.
 *
 * Derived rather than stored, because it is a sentence about the interval, not
 * a fact about the plan — and because "two months free" has to stay true. It
 * is, at $3 and $30: twelve monthly payments would be $36.
 */
export function billingNote(plan: Plan): string {
  return plan.billing_interval === "year"
    ? "Billed once a year — two months free."
    : "Billed monthly. Cancel any time.";
}

/** "Monthly" / "Yearly" — the label on the segmented control. */
export function intervalLabel(plan: Plan): string {
  return plan.billing_interval === "year" ? "Yearly" : "Monthly";
}

/**
 * How the pay screen names what is about to be charged: "$3 monthly".
 *
 * Not `priceParts` with a slash — "$3 /month, starting today" reads as a rate
 * card rather than a sentence.
 */
export function chargeSummary(plan: Plan): string {
  const price = formatPrice(plan.price_cents, plan.currency);
  return `${price} ${plan.billing_interval === "year" ? "yearly" : "monthly"}`;
}
