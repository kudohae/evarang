/**
 * Counts the screens using a shared resource and calls `idle` once none has used it for `delayMs`.
 * `acquire` returns the call that ends that use; calling it again does nothing.
 */
export function createLease(idle: () => void, delayMs: number) {
  let users = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    users: () => users,
    acquire(): () => void {
      users++;
      if (timer) clearTimeout(timer);
      timer = null;
      let done = false;
      return () => {
        if (done) return;
        done = true;
        users--;
        if (users > 0) return;
        timer = setTimeout(() => {
          timer = null;
          if (users === 0) idle();
        }, delayMs);
      };
    },
  };
}
