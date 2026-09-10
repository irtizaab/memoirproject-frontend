/**
 * Where the reader's session is kept, and why it is a cookie.
 *
 * `features/invitation/contributorStorage.ts` keeps the participant token in
 * `localStorage`, which is right for a contributor: everything they do happens
 * in the browser. The reader is the opposite case. `/m/[token]` renders on the
 * server so a family opening a memoir on a phone on a train gets the prose in
 * the first response, and a server render cannot see `localStorage`.
 *
 * So the session goes in a cookie — the one browser store that arrives with
 * the request. It is written by the gate after the door lets someone in, read
 * by the page during render, and sent on to the API from there.
 *
 * Not `httpOnly`, because it is written by JavaScript rather than by a server
 * that has no route to write it from; the participant token already lives in
 * `localStorage` under the same threat model. What it *is* is `SameSite=Lax`,
 * so another site cannot cause a request that carries it, and path-scoped to
 * the one memoir it opens.
 */

/** One cookie per memoir. Somebody may be reading two. */
export function readerCookieName(token: string): string {
  return `memoir_reader_${token}`;
}

/**
 * The reader's name, beside the session rather than inside it.
 *
 * Not a credential and not proof of anything — it is what the composer prints
 * above a reflection somebody is about to leave, so that the page can say
 * "leaving this as Clara Harrison" instead of asking again. The session token
 * is opaque by design and the server render has nowhere else to learn it from.
 */
export function readerNameCookieName(token: string): string {
  return `memoir_reader_name_${token}`;
}

/**
 * Reads the session out of a `document.cookie` string.
 *
 * Takes the string rather than reading it, so the same function serves the
 * browser and the server page — where it is handed `cookies().toString()`.
 */
export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name && rest.length) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function readReaderSession(
  cookies: string,
  token: string,
): string | null {
  return readCookie(cookies, readerCookieName(token));
}

/** Whoever opened this memoir in this browser, for the composer to print. */
export function readReaderName(cookies: string, token: string): string {
  return readCookie(cookies, readerNameCookieName(token)) ?? "you";
}

/**
 * Stores the session in this browser.
 *
 * A year, because a memoir is not a banking session and being asked for the
 * passphrase again on every visit would make a family stop opening it. It stops
 * working sooner than that on its own terms anyway: the backend signs it with
 * the passphrase and the live link, so replacing either closes it immediately.
 */
export function storeReaderSession(
  token: string,
  session: string,
  name: string,
): void {
  if (typeof document === "undefined") return;

  const attributes = [
    `path=/m/${encodeURIComponent(token)}`,
    "max-age=31536000",
    "samesite=lax",
    window.location.protocol === "https:" ? "secure" : "",
  ].filter(Boolean);

  for (const [key, value] of [
    [readerCookieName(token), session],
    [readerNameCookieName(token), name],
  ]) {
    document.cookie = [
      `${key}=${encodeURIComponent(value)}`,
      ...attributes,
    ].join("; ");
  }
}

/** Forgets it — after the backend has refused it, so the gate is shown again. */
export function clearReaderSession(token: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${readerCookieName(token)}=; path=/m/${encodeURIComponent(token)}; max-age=0`;
}

/* -------------------------------------------------------------------------
 * Which memoir a link opened
 * -------------------------------------------------------------------------
 * `features/invitation` keys its memory of a person on the **memoir**, not on
 * the link, so that reissuing a link does not turn every contributor into a
 * stranger. The reader arrives holding the opposite: a link, and no idea which
 * memoir it opens until the door tells it.
 *
 * So this is the one note that bridges them, written the first time somebody
 * gets in. It is not a credential and opens nothing — it is a uuid, kept so
 * that the next visit can ask the invitation feature "who am I here".
 * ------------------------------------------------------------------------- */

const MEMOIR_KEY_PREFIX = "memoir.reader.link.";

export function rememberMemoir(token: string, memoirId: string): void {
  try {
    window.localStorage.setItem(MEMOIR_KEY_PREFIX + token, memoirId);
  } catch {
    // Private browsing, or storage full. Costs a duplicate name in the index
    // at worst, and never the memory somebody came to leave.
  }
}

export function recallMemoir(token: string): string | null {
  try {
    return window.localStorage.getItem(MEMOIR_KEY_PREFIX + token);
  } catch {
    return null;
  }
}
