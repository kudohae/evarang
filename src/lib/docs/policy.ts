/*
  Where documents live first.
  - local-first (now): the browser is the working copy; members who agreed get an account copy that follows it.
  - account-first (later): sign-in required, reads go to the account first, the browser is a cache.
  Feature code only talks to the document stores, so switching does not touch it.
*/

export type StoragePolicy = "local-first" | "account-first";

export const STORAGE_POLICY: StoragePolicy = "local-first";

/** One consent covers exams, practice sessions and notes. */
export function syncEnabled(user: { recordsConsent: boolean } | null | undefined): boolean {
  return Boolean(user?.recordsConsent);
}
