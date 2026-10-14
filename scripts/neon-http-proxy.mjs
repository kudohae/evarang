#!/usr/bin/env node
/*
  Local stand-in for Neon's HTTP query endpoint, so the app's Neon client can talk to a plain Postgres.
  For development only: no authentication, listens on localhost.

    npm i --no-save pg
    node scripts/neon-http-proxy.mjs [port] [postgres-url]
      port          default 4444
      postgres-url  default postgres://postgres@127.0.0.1:5432/postgres

  Then run the app with
    DATABASE_URL=postgres://postgres:x@localhost/postgres NEON_FETCH_ENDPOINT=http://localhost:4444/sql npm run dev
*/
import http from "node:http";
import pg from "pg";

const port = Number(process.argv[2] ?? 4444);
const target = process.argv[3] ?? "postgres://postgres@127.0.0.1:5432/postgres";

// Hand every value back as text; the Neon client parses it by type, as it does with Neon's own answers.
const pool = new pg.Pool({ connectionString: target, types: { getTypeParser: () => (v) => v } });

async function one({ query, params }) {
  const r = await pool.query({ text: query, values: params, rowMode: "array" });
  return { fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })), rows: r.rows, command: r.command, rowCount: r.rowCount };
}

http
  .createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const q = JSON.parse(body);
      const out = q.queries ? { results: await Promise.all(q.queries.map(one)) } : await one(q);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ message: e.message, code: e.code }));
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Neon HTTP proxy on http://localhost:${port}/sql → ${target}`));
