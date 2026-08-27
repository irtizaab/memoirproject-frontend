import { redirect } from "next/navigation";

/**
 * There is no landing page yet, and `/` is not a screen anyone was sent to on
 * purpose. Send them to the archive; if they are not signed in, the `(app)`
 * layout bounces them on to onboarding, which is where a first-time visitor
 * belongs anyway.
 */
export default function Home() {
  redirect("/archive");
}
