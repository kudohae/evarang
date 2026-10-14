import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

// For local development against a plain Postgres behind a Neon-compatible HTTP proxy.
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

let client: NeonQueryFunction<false, false> | null = null;

/** One HTTP query client for the whole server; each caller creates its own tables lazily. */
export function neonClient(): NeonQueryFunction<false, false> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  client ??= neon(url);
  return client;
}
