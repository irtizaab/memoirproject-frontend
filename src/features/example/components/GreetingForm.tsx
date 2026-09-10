"use client";

/**
 * The interactive half of the example feature: the user types a name, the
 * result comes back, the UI updates. This is exactly the case the client data
 * path exists for.
 *
 * Note the layering — this component knows nothing about HTTP, the endpoint,
 * or the base URL. It calls a hook and renders states.
 *
 * Note also what drives validation: `greetingRequestSchema`, the same schema
 * that describes the request body and produces the TypeScript types. The rules
 * are written once and enforced in the form, at the request boundary, and in
 * the type system.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isApiError } from "@/lib/api/errors";
import { useGreetingMutation } from "@/features/example/hooks";
import { GreetingCard } from "@/features/example/components/GreetingCard";
import {
  greetingRequestSchema,
  type GreetingFormValues,
  type GreetingRequest,
} from "@/features/example/schemas";

export function GreetingForm() {
  const greeting = useGreetingMutation();

  // Three generics, and the order matters: the fields the form holds (input,
  // where defaulted fields are optional), the resolver context, and what the
  // submit handler receives (output, after Zod has applied its defaults).
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<GreetingRequest, unknown, GreetingFormValues>({
    resolver: zodResolver(greetingRequestSchema),
    // "onChange" gives feedback as the user types rather than only on submit.
    mode: "onChange",
    defaultValues: { name: "", excited: true },
  });

  // `handleSubmit` only invokes this once the schema passes, so an invalid
  // request never reaches the network.
  const onSubmit = handleSubmit((values) => greeting.mutate(values));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Client path</CardTitle>
          <CardDescription>
            Validated by the feature schema, then submitted from the browser
            through a TanStack Query mutation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="greeting-name">Name</Label>
              <Input
                id="greeting-name"
                placeholder="Ada Lovelace"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "greeting-name-error" : undefined
                }
                {...register("name")}
              />
              {/* The message comes from the schema, not from this component. */}
              {errors.name && (
                <p
                  id="greeting-name-error"
                  className="text-sm text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="greeting-excited"
                type="checkbox"
                className="size-4 accent-primary"
                {...register("excited")}
              />
              <Label htmlFor="greeting-excited" className="font-normal">
                Excited
              </Label>
            </div>

            <Button type="submit" disabled={!isValid || greeting.isPending}>
              {greeting.isPending ? "Greeting…" : "Greet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {greeting.isError && <GreetingError error={greeting.error} />}
      {greeting.isSuccess && (
        <GreetingCard greeting={greeting.data} title="Response" />
      )}
    </div>
  );
}

/**
 * Errors are rendered by cause, not as one generic "something went wrong".
 * A dev hitting the `contract` branch learns immediately that the backend
 * changed shape, rather than going hunting.
 */
function GreetingError({ error }: { error: Error }) {
  if (!isApiError(error)) {
    return <ErrorBox title="Unexpected error">{error.message}</ErrorBox>;
  }

  const title = {
    network: "Cannot reach the backend",
    http: `Request rejected${error.status ? ` (${error.status})` : ""}`,
    contract: "Backend contract mismatch",
  }[error.code];

  return (
    <ErrorBox title={title}>
      {error.message}
      {error.code === "contract" && (
        <span className="mt-2 block text-xs">
          The response did not match the schema in{" "}
          <code className="font-mono">features/example/schemas.ts</code>. Update
          the schema to match the backend&apos;s Pydantic model.
        </span>
      )}
    </ErrorBox>
  );
}

function ErrorBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm"
    >
      <p className="font-medium text-destructive">{title}</p>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}
