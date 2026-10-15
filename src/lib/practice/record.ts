import type { Attempt } from "@/lib/domain/attempt";
import type { Session } from "@/lib/domain/session";

function withAttempt(s: Session, a: Attempt): Session {
  return { ...s, attempts: [...s.attempts.filter((x) => x.id !== a.id), a] };
}

/**
 * Saves an attempt into its own session. Usually that is the open one; a save that finishes after the
 * learner moved on (feedback arriving late) goes to the session it came from. Returns the open session,
 * updated if the attempt was its own.
 */
export async function recordAttempt(
  open: Session | null,
  a: Attempt,
  store: { get(id: string): Promise<Session | null>; save(s: Session): Promise<void> },
): Promise<Session | null> {
  if (open && open.id === a.sessionId) {
    const updated = withAttempt(open, a);
    await store.save(updated);
    return updated;
  }
  const earlier = await store.get(a.sessionId);
  if (earlier) await store.save(withAttempt(earlier, a));
  return open;
}
