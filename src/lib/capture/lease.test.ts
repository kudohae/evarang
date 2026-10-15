import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLease } from "@/lib/capture/lease";

describe("createLease", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts the users", () => {
    const lease = createLease(() => {}, 1000);
    const a = lease.acquire();
    lease.acquire();
    expect(lease.users()).toBe(2);
    a();
    expect(lease.users()).toBe(1);
  });

  it("goes idle a while after the last user leaves", () => {
    const idle = vi.fn();
    const lease = createLease(idle, 1000);
    const a = lease.acquire();
    const b = lease.acquire();
    a();
    vi.advanceTimersByTime(5000);
    expect(idle).not.toHaveBeenCalled();
    b();
    vi.advanceTimersByTime(999);
    expect(idle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it("a user arriving before the delay keeps it", () => {
    const idle = vi.fn();
    const lease = createLease(idle, 1000);
    lease.acquire()();
    vi.advanceTimersByTime(500);
    lease.acquire();
    vi.advanceTimersByTime(5000);
    expect(idle).not.toHaveBeenCalled();
  });

  it("leaving twice counts once", () => {
    const idle = vi.fn();
    const lease = createLease(idle, 1000);
    const a = lease.acquire();
    lease.acquire();
    a();
    a();
    vi.advanceTimersByTime(5000);
    expect(idle).not.toHaveBeenCalled();
  });

  it("goes idle again after a second round", () => {
    const idle = vi.fn();
    const lease = createLease(idle, 1000);
    lease.acquire()();
    vi.advanceTimersByTime(1000);
    lease.acquire()();
    vi.advanceTimersByTime(1000);
    expect(idle).toHaveBeenCalledTimes(2);
  });
});
