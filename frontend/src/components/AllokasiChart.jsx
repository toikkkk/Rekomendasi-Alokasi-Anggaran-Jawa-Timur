import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

const SHORT_LABEL = {
  rasio_pegawai_pct: "Pegawai",
  rasio_modal_pct: "Modal",
  rasio_barang_jasa_pct: "Brg & Jasa",
  rasio_bansos_pct: "Bansos",
  rasio_hibah_pct: "Hibah",
  rasio_bantuan_keu_pct: "Bantuan Keu",
};

export default function AllokasiChart({ data = [], mode = "bar", compare = null }) {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">Tidak ada data</div>;

  if (mode === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="nilai" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, nilai }) => `${label} ${nilai.toFixed(1)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v.toFixed(2)}%`} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (compare) {
    const merged = data.map((d, i) => ({
      label: SHORT_LABEL[d.sektor] ?? d.sektor,
      Aktual: d.nilai,
      Rekomendasi: compare[i]?.nilai ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={merged} margin={{ bottom: 20 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
          <YAxis unit="%" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${v.toFixed(2)}%`} />
          <Legend />
          <Bar dataKey="Aktual" fill="#3b82f6" radius={[4,4,0,0]} />
          <Bar dataKey="Rekomendasi" fill="#10b981" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const chartData = data.map((d, i) => ({
    label: SHORT_LABEL[d.sektor] ?? d.label ?? d.sektor,
    nilai: d.nilai,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ bottom: 20 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
        <YAxis unit="%" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v.toFixed(2)}%`} />
        <Bar dataKey="nilai" radius={[4,4,0,0]}>
          {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
