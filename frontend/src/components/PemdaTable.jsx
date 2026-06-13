import { useState } from "react";
import { useNavigate } from "react-router-dom";
import KlasterBadge from "./KlasterBadge";
import { formatAngka } from "../utils/formatters";

const COLUMNS = [
  { key: "nama_pemda",    label: "Nama Daerah" },
  { key: "klaster",      label: "Klaster" },
  { key: "ipm",          label: "IPM" },
  { key: "kemiskinan_pct", label: "Kemiskinan (%)" },
];

export default function PemdaTable({ data = [] }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState("nama_pemda");
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 select-none"
              >
                {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            ))}
            <th className="px-4 py-3 text-left">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row) => (
            <tr
              key={row.nama_pemda}
              className="hover:bg-blue-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/daerah/${encodeURIComponent(row.nama_pemda)}`)}
            >
              <td className="px-4 py-3 font-medium text-gray-800">{row.nama_pemda}</td>
              <td className="px-4 py-3"><KlasterBadge klaster={row.klaster} size="sm" /></td>
              <td className="px-4 py-3">{formatAngka(row.ipm)}</td>
              <td className="px-4 py-3">{formatAngka(row.kemiskinan_pct)}%</td>
              <td className="px-4 py-3 text-blue-600 hover:underline">Lihat →</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
