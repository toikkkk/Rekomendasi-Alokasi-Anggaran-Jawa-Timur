const SEKTORS = [
  { key: "rasio_pegawai_pct",     label: "Pegawai",           color: "accent-blue-500" },
  { key: "rasio_modal_pct",       label: "Modal",             color: "accent-emerald-500" },
  { key: "rasio_barang_jasa_pct", label: "Barang & Jasa",     color: "accent-amber-500" },
  { key: "rasio_bansos_pct",      label: "Bantuan Sosial",    color: "accent-red-500" },
  { key: "rasio_hibah_pct",       label: "Hibah",             color: "accent-purple-500" },
  { key: "rasio_bantuan_keu_pct", label: "Bantuan Keuangan",  color: "accent-pink-500" },
];

export default function SimulasiSlider({ alokasi = {}, onChange }) {
  const total = SEKTORS.reduce((sum, { key }) => sum + (alokasi[key] ?? 0), 0);
  const over = total > 100;

  return (
    <div className="space-y-3">
      {SEKTORS.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-36 text-sm text-gray-700 shrink-0">{label}</span>
          <input
            type="range" min={0} max={80} step={0.5}
            value={alokasi[key] ?? 0}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className={`flex-1 h-2 rounded-lg cursor-pointer ${color}`}
          />
          <span className="w-14 text-sm text-right font-mono tabular-nums">
            {(alokasi[key] ?? 0).toFixed(1)}%
          </span>
        </div>
      ))}
      <div className={`text-sm font-semibold pt-1 ${over ? "text-red-600" : "text-gray-700"}`}>
        Total: {total.toFixed(1)}%
        {over && <span className="ml-2 text-red-500">⚠ Melebihi 100%</span>}
      </div>
    </div>
  );
}
