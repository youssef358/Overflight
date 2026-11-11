"use client";
import { CONDITIONS, type Condition, type Pylon } from "@/lib/pylons";

const BADGE: Record<Condition, string> = {
  ok: "bg-green-100 text-green-800",
  defect: "bg-red-100 text-red-800",
  not_inspected: "bg-slate-100 text-slate-700",
};

type Props = {
  pylons: Pylon[];
  onConditionChange: (id: number, condition: Condition) => void;
};

export function PylonTable({ pylons, onConditionChange }: Props) {
  if (pylons.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-slate-500">No pylons match these filters.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-slate-500">
        <tr>
          <th className="py-2">Code</th>
          <th>Line</th>
          <th>#</th>
          <th>Condition</th>
          <th>Last inspected</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        {pylons.map((p) => (
          <tr key={p.id} className="border-b last:border-0">
            <td className="py-2 font-mono">{p.code}</td>
            <td>{p.lineCode}</td>
            <td>{p.seq}</td>
            <td>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[p.condition]}`}>{p.condition}</span>
            </td>
            <td>{p.lastInspectedAt ? new Date(p.lastInspectedAt).toLocaleString() : "never"}</td>
            <td>
              <select
                aria-label={`Condition of ${p.code}`}
                className="rounded border px-1 py-0.5"
                value={p.condition}
                onChange={(e) => onConditionChange(p.id, e.target.value as Condition)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
