import { execFileSync } from "node:child_process";

/** Runs against the local database only: clears the sign-up and login attempt log, so repeated runs stay under its limits. */
export default function setup() {
  try {
    execFileSync("psql", ["postgres://postgres:x@127.0.0.1:5432/postgres", "-qc", "DELETE FROM auth_attempts"], { stdio: "ignore" });
  } catch {
    // First run: the table is made by the app on first use.
  }
}
