/**
 * The contract for the billing screen — the twin of the backend's
 * `BillingOverview` and `Plan` in `src/models/account_models.py`.
 */

import { z } from "zod";

export const planSchema = z.object({
  code: z.string(),
  name: z.string(),
  tagline: z.string(),
  /** Cents. The frontend formats it — an API should not ship a locale. */
  price_cents: z.number().int(),
  currency: z.string(),
  /**
   * What the price is per. Monthly and yearly Keepsake are two rows sharing a
   * name and an entitlement, so this is the only field that tells them apart.
   */
  billing_interval: z.enum(["month", "year"]),
  storage_limit_bytes: z.number().int(),
});

/** The price list, cheapest first — the backend orders it. */
export const plansSchema = z.array(planSchema);

/**
 * How full the archive is.
 *
 * A measure of a container, not a completion percentage. The product forbids
 * progress indicators, and this is not one — nothing here says how "finished"
 * a memoir is, because a memoir is never finished.
 */
export const storageUsageSchema = z.object({
  used_bytes: z.number().int(),
  limit_bytes: z.number().int(),
});

export const billingOverviewSchema = z.object({
  plan: planSchema,
  storage: storageUsageSchema,
  /** Null until something has actually been charged. Never invented. */
  renews_on: z.string().nullable(),
  /** False until Stripe is wired up. */
  payments_enabled: z.boolean(),
});

export type Plan = z.infer<typeof planSchema>;
export type BillingInterval = Plan["billing_interval"];
export type StorageUsage = z.infer<typeof storageUsageSchema>;
export type BillingOverview = z.infer<typeof billingOverviewSchema>;
