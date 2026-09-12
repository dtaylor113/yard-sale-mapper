// Keeping the app's data across page reloads, in the browser.
//
// The whole data layer is still in-memory React state (see data-provider.tsx),
// which means an import or a batch of geocoded coordinates evaporated on every
// refresh. Until there's a real backend, we mirror that state into
// localStorage: hydrate from it on startup, write it back whenever it changes.
// This file is the serialization and storage access, kept pure where it can be
// so the parsing/versioning is testable without a real `localStorage`.

import type { Stop, YardSaleEvent } from "./types";

// Bump when the persisted shape changes in a way old data can't satisfy;
// anything stored under a different version is ignored and reseeded.
const STORAGE_VERSION = 1;
const STORAGE_KEY = "yard-sale-mapper/state";

export interface PersistedState {
  events: YardSaleEvent[];
  stopsByEvent: Record<string, Stop[]>;
}

interface StoredEnvelope extends PersistedState {
  version: number;
}

export function serializeState(state: PersistedState): string {
  const envelope: StoredEnvelope = { version: STORAGE_VERSION, ...state };
  return JSON.stringify(envelope);
}

/**
 * Parses a stored string back into state, or null when it's absent, unparseable,
 * from a different version, or the wrong shape — so a corrupt or stale blob
 * quietly reseeds from the mocks rather than crashing the app.
 */
export function parseStoredState(raw: string | null): PersistedState | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as StoredEnvelope).version !== STORAGE_VERSION ||
    !Array.isArray((parsed as StoredEnvelope).events) ||
    typeof (parsed as StoredEnvelope).stopsByEvent !== "object" ||
    (parsed as StoredEnvelope).stopsByEvent === null
  ) {
    return null;
  }

  const envelope = parsed as StoredEnvelope;
  return { events: envelope.events, stopsByEvent: envelope.stopsByEvent };
}

/** Reads persisted state from localStorage, or null when nothing usable is there. */
export function loadPersistedState(): PersistedState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return parseStoredState(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private-mode or disabled storage throws on access; treat as "nothing saved".
    return null;
  }
}

/** Writes state to localStorage, silently ignoring quota/permission failures. */
export function savePersistedState(state: PersistedState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch {
    // Over quota or storage disabled — not worth interrupting the user over.
  }
}
