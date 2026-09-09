// Event URLs are a readable slug with the event's id pinned on the end:
//
//   /events/sterling-neighborhood-sale-7wm4xb
//
// Only the trailing id is load-bearing. The words in front are decorative, so
// renaming an event changes how the URL reads without stranding links that
// neighbors already texted around or posted to a Facebook group. (Same shape
// GitHub and Stack Overflow use.) Pinning the id also means two events named
// "Spring Cleanout" can't collide.

/** Ids must stay free of "-" so the slug/id boundary is unambiguous. */
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 6;

const MAX_SLUG_LENGTH = 60;

export function newEventId() {
  const values =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(ID_LENGTH))
      : Array.from({ length: ID_LENGTH }, () => Math.floor(Math.random() * 2 ** 32));

  return Array.from(values, (value) => ID_ALPHABET[value % ID_ALPHABET.length]).join("");
}

/** Turns an event name into the readable part of its URL. May be empty. */
export function slugify(name: string) {
  return (
    name
      // Split accented characters apart so the marks can be dropped and the
      // plain letter survives: "Café" becomes "cafe", not "caf".
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      // Anything that isn't a letter or digit is a separator, which collapses
      // runs of spaces and punctuation in one pass.
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG_LENGTH)
      // The length cut can land mid-separator.
      .replace(/-+$/, "")
  );
}

/** The canonical path for an event. */
export function eventPath(event: { id: string; name: string }) {
  const slug = slugify(event.name);
  // A name made entirely of punctuation or emoji slugs to nothing; fall back to
  // the bare id rather than emitting a path with a leading dash.
  return slug ? `/events/${slug}-${event.id}` : `/events/${event.id}`;
}

/**
 * Recovers the event id from a URL segment. The slug can contain any number of
 * dashes, so the id is whatever follows the last one — and a segment with no
 * dash at all is treated as a bare id, which keeps hand-typed and legacy
 * id-only URLs working.
 */
export function eventIdFromPath(segment: string) {
  return segment.slice(segment.lastIndexOf("-") + 1);
}
