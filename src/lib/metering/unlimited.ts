/**
 * Members exempt from the daily free allowances, listed by email in UNLIMITED_EMAILS
 * (comma, space or newline separated). Kept in the environment so no address lives in the code.
 */
export function isUnlimited(email: string | undefined, list: string | undefined): boolean {
  if (!email || !list) return false;
  const wanted = email.trim().toLowerCase();
  return list
    .split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .some((e) => e && e === wanted);
}
