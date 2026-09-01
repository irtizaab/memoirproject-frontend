"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBilling, listPlans, selectPlan } from "@/features/billing/api";
import type { BillingOverview } from "@/features/billing/schemas";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
};

/**
 * The plan and the storage meter.
 *
 * Gated on a session so it does not fire a guaranteed 401 while the app is
 * still working out who is signed in. `retry: false` because the interesting
 * failure here is a 404 — no account yet — and retrying it three times only
 * delays showing the person a useful answer.
 */
export function useBilling() {
  const { session, isPending } = useSupabaseSession();

  return useQuery({
    queryKey: billingKeys.all,
    queryFn: () => getBilling(),
    enabled: !isPending && Boolean(session),
    retry: false,
  });
}


/**
 * The price list.
 *
 * Not gated on a session, unlike `useBilling` — the endpoint is public, and
 * the screen that needs it (onboarding's pricing step) runs where the session
 * is still settling. `staleTime` is generous because a price list changes on a
 * deploy, not on a render.
 */
export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: () => listPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Records which term was chosen on the pricing screen.
 *
 * A mutation and not a fire-and-forget call, so the billing screen's cache is
 * invalidated and agrees with the choice the moment it is next opened. The
 * caller is expected to navigate regardless of whether this succeeds: the
 * account is already on a valid plan, and blocking someone at the last step of
 * onboarding over a cosmetic mismatch would be the worse trade.
 */
export function useSelectPlan() {
  const queryClient = useQueryClient();

  return useMutation<BillingOverview, Error, string>({
    mutationFn: (code) => selectPlan(code),
    onSuccess: (overview) => {
      queryClient.setQueryData(billingKeys.all, overview);
    },
  });
}
