// Server only: every SQL query for pylons lives here, so route handlers stay thin.
import { pool } from "./db";
import type { Condition, Pylon, PylonFilters } from "./pylons";

// Aliases turn snake_case columns into the camelCase fields of the Pylon type.
const COLUMNS = `id, line_code as "lineCode", seq, code, lat, lng, condition,
                 last_inspected_at as "lastInspectedAt"`;

export async function listPylons(filters: PylonFilters): Promise<Pylon[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  // Parameters ($1, $2...) are never concatenated into the SQL: no injection.
  if (filters.condition) {
    params.push(filters.condition);
    where.push(`condition = $${params.length}`);
  }
  if (filters.line) {
    params.push(filters.line);
    where.push(`line_code = $${params.length}`);
  }

  const sql = `select ${COLUMNS} from pylons
               ${where.length ? `where ${where.join(" and ")}` : ""}
               order by line_code, seq`;
  const { rows } = await pool.query<Pylon>(sql, params);
  return rows;
}

// Returns null when the pylon does not exist, so the route can answer 404.
export async function updatePylonCondition(id: number, condition: Condition): Promise<Pylon | null> {
  const { rows } = await pool.query<Pylon>(
    `update pylons
        set condition = $2,
            last_inspected_at = case when $2 = 'not_inspected' then null else now() end
      where id = $1
  returning ${COLUMNS}`,
    [id, condition],
  );
  return rows[0] ?? null;
}
