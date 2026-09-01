# features/billing

The plan an account is on, and how full its archive is.

| File | What it holds |
| --- | --- |
| `schemas.ts` | `billingOverviewSchema`, `planSchema`, `plansSchema`, `storageUsageSchema` |
| `api.ts` | `listPlans()`, `getBilling()`, `selectPlan()` |
| `hooks.ts` | `usePlans()`, `useBilling()`, `useSelectPlan()` |
| `utils.ts` | `formatPrice`, `priceParts`, `billingNote`, `intervalLabel`, `chargeSummary` |
| `components/BillingScreen.tsx` | `/billing` |

## This feature owns the price

Two screens quote it: `/billing`, and onboarding's pricing step. Both read `GET /plans`, and the
formatting helpers in `utils.ts` are shared so they render it the same way.

They did not always. Onboarding kept a `PLANS` constant saying $3/month while the `plan` table said
$8, and nothing connected them, so nobody noticed for as long as nobody put the two screens side by
side. `features/onboarding` now imports from this feature's `index.ts` rather than keeping a list.

Keepsake bills **monthly ($3) or yearly ($30)** — two rows in `plan` sharing a name, a tagline and a
10 GiB entitlement, differing only in `billing_interval`. That field, not the plan name, is what
tells them apart on screen, which is why `BillingScreen` renders `per {billing_interval}` rather
than the words "per month".

`useSelectPlan()` records which term was chosen at the end of onboarding. It is an entitlement
change, not a charge — the response still comes back `payments_enabled: false` with no renewal date.

## No Stripe yet

Payments are not wired up. `payments_enabled` comes back `false`, "Manage plan"
renders disabled beside a line saying why, and `renews_on` is null — **no
renewal date is invented**, because a plausible-looking date on a billing
screen is a lie about money.

When Stripe lands: the button gets an href, the date gets a source, `PATCH
/billing/plan` becomes something a webhook writes rather than the pay step, and
nothing about this feature's shape changes.

## The meter is real

`storage.used_bytes` is summed by the backend from confirmed uploads
(`media_asset.byte_size`, where `uploaded_at IS NOT NULL`), and each of those
figures came from asking storage how big the object is — never from what the
client claimed. Upload a photograph and the number here moves.

It is a **meter**, not a progress bar: it measures how full a container is, not
how complete anything is. `components/ui/progress.tsx` exports it as `Meter`
for exactly that reason — do not reach for it to show how "finished" a memoir
is.

## 404 is a normal answer

Someone who signed up but never claimed a draft has no `user_account` row, so
there is genuinely nothing to bill for. `useBilling` sets `retry: false` and
the screen says so plainly.
