"use client";
import { useMemo, useState } from "react";
import { PylonMap } from "@/components/PylonMap";
import { PylonTable } from "@/components/PylonTable";
import { pylonsToGeoJSON } from "@/lib/geojson";
import { CONDITIONS, type Condition, type PylonFilters } from "@/lib/pylons";
import { usePylons } from "@/lib/use-pylons";

export default function Home() {
  const [filters, setFilters] = useState<PylonFilters>({});
  const [version, setVersion] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  // The map always shows the whole network (context for the operator);
  // the filters only narrow the table.
  const all = usePylons({}, version);
  const filtered = usePylons(filters, version);

  const geojson = useMemo(() => pylonsToGeoJSON(all.data ?? []), [all.data]);
  const lineCodes = useMemo(() => [...new Set((all.data ?? []).map((p) => p.lineCode))], [all.data]);

  async function changeCondition(id: number, condition: Condition) {
    setActionError(null);
    const res = await fetch(`/api/pylons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condition }),
    });
    if (!res.ok) {
      setActionError(`Update failed (${res.status})`);
      return;
    }
    setVersion((v) => v + 1); // refetch map and table
  }

  const error = all.error ?? filtered.error ?? actionError;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Line inspection</h1>
        <p className="text-slate-500">Pylons by condition. Click a point for details.</p>
      </header>

      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <PylonMap data={geojson} />

      <section className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Filter by condition"
            className="rounded border px-2 py-1"
            value={filters.condition ?? ""}
            onChange={(e) => setFilters({ ...filters, condition: (e.target.value || undefined) as Condition | undefined })}
          >
            <option value="">All conditions</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter by line"
            className="rounded border px-2 py-1"
            value={filters.line ?? ""}
            onChange={(e) => setFilters({ ...filters, line: e.target.value || undefined })}
          >
            <option value="">All lines</option>
            {lineCodes.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {filtered.data === null ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <PylonTable pylons={filtered.data} onConditionChange={changeCondition} />
        )}
      </section>
    </main>
  );
}
