/*
  Notices raised deep in the request code and shown by the page (a dialog), without threading callbacks
  through every caller. Plain listeners, so it also runs in tests.
*/

type Listener = (message: string) => void;
const ownKeyOut = new Set<Listener>();

/** The member's own API key could not be used (refused, or its quota is spent). */
export function emitOwnKeyOut(message: string): void {
  for (const l of ownKeyOut) l(message);
}

export function onOwnKeyOut(l: Listener): () => void {
  ownKeyOut.add(l);
  return () => ownKeyOut.delete(l);
}
