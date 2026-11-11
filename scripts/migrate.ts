// Usage: npm run db:migrate        (apply new migrations)
//        npm run db:seed           (apply migrations, then reload demo data)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../lib/db";

const dbDir = path.join(process.cwd(), "db");

async function main() {
  await pool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

  const files = (await readdir(path.join(dbDir, "migrations")))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_, 002_ ... run in order

  for (const file of files) {
    const done = await pool.query("select 1 from schema_migrations where name = $1", [file]);
    if (done.rowCount) continue;

    const sql = await readFile(path.join(dbDir, "migrations", file), "utf8");
    const client = await pool.connect();
    try {
      // One transaction per migration: it applies fully or not at all.
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  if (process.argv.includes("--seed")) {
    await pool.query(await readFile(path.join(dbDir, "seed.sql"), "utf8"));
    console.log("seeded demo data");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
