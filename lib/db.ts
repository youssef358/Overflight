import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://hylight:hylight@localhost:15432/hylight";

// In dev, Next.js reloads modules on every edit. Keeping the pool on globalThis
// stops each reload from opening a new set of connections.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForDb.pgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;
