/**
 * The billing feature's calls to the backend.
 *
 * Three: the price list (public), the account's own overview (auth), and
 * choosing a term (auth). The price list is public because onboarding's
 * pricing step reads it, and that step should not depend on where it happens
 * to sit relative to signup.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  billingOverviewSchema,
  plansSchema,
  type BillingOverview,
  type Plan,
} from "@/features/billing/schemas";

const ENDPOINTS = {
  plans: "/plans",
  billing: "/billing",
  plan: "/billing/plan",
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/**
 * The caller's plan and their real storage consumption.
 *
 * 404 for someone who signed up but never claimed a draft — they have no
 * account row yet, so there is genuinely nothing to bill for.
 */
export async function getBilling(
  options: RequestOptions = {},
): Promise<BillingOverview> {
  return apiRequest({
    path: ENDPOINTS.billing,
    method: "GET",
    headers: await authHeaders(),
    schema: billingOverviewSchema,
    cache: "no-store",
    ...options,
  });
}


/**
 * Every plan that can be signed up for, cheapest first.
 *
 * No `authHeaders`: it is a price list, and the pricing screen asks for it
 * before the account has a billing overview to speak of.
 */
export async function listPlans(
  options: RequestOptions = {},
): Promise<Plan[]> {
  return apiRequest({
    path: ENDPOINTS.plans,
    method: "GET",
    schema: plansSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * Moves the account onto a plan term, and returns the refreshed overview.
 *
 * Not a payment. Nothing is charged — the response still comes back with
 * `payments_enabled: false` and no renewal date. It exists so the billing
 * screen quotes the term that was actually chosen on the pricing screen.
 */
export async function selectPlan(
  code: string,
  options: RequestOptions = {},
): Promise<BillingOverview> {
  return apiRequest({
    path: ENDPOINTS.plan,
    method: "PATCH",
    headers: await authHeaders(),
    body: { code },
    schema: billingOverviewSchema,
    cache: "no-store",
    ...options,
  });
}
