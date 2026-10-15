/*
  Notices raised deep in the request code and shown by the page (a dialog), without threading callbacks
  through every caller. Plain listeners, so it also runs in tests.
*/

type Listener = (message: string) => void;
const ownKeyOut = new Set<Listener>();
let keyOut = false;

/**
 * The member's own API key could not be used (refused, or its quota is spent). Said once: until the page
 * reloads or a key is saved, requests skip the key instead of failing on it again.
 */
export function emitOwnKeyOut(message: string): void {
  if (keyOut) return;
  keyOut = true;
  for (const l of ownKeyOut) l(message);
}

export function ownKeyIsOut(): boolean {
  return keyOut;
}

/** A key was saved: try it again. */
export function clearOwnKeyOut(): void {
  keyOut = false;
}

export function onOwnKeyOut(l: Listener): () => void {
  ownKeyOut.add(l);
  return () => ownKeyOut.delete(l);
}
