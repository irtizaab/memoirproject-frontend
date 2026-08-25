export function firstName(name: string): string {
  return (name || "them").split(" ")[0];
}

export function possessive(name: string): string {
  return name + (/s$/i.test(name) ? "'" : "'s");
}

export function slugifyName(name: string): string {
  return (name || "memoir")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .split(/\s+/)
    .join("-");
}
