import { useEffect, useState, useMemo } from "react";
import { getPerbandingan } from "../services/api";
import Icon from "../components/Icon";
import { LineChart, Donut } from "../components/Charts";
import { KlasterBadge, Skel, SkeletonTable, useLoad } from "../components/UI";
import { formatAngka } from "../utils/formatters";

const RASIO_LABELS = {
  rasio_pegawai_pct: "Pegawai", rasio_modal_pct: "Modal",
  rasio_barang_jasa_pct: "Brg & Jasa", rasio_bansos_pct: "Bansos",
  rasio_hibah_pct: "Hibah", rasio_bantuan_keu_pct: "Bantuan Keu",
};

const SortIco = ({ active, dir }) => (
  <span className="sort-ico">
    <Icon name="chevDown" size={9} style={{ transform: "rotate(180deg)", marginBottom: -2, opacity: active && dir === "asc" ? 1 : .4 }} />
    <Icon name="chevDown" size={9} style={{ opacity: active && dir === "desc" ? 1 : .4 }} />
  </span>
);

export default function Perbandingan() {
  const loading = useLoad(700);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [filterNama, setFilterNama] = useState(localStorage.getItem("selected_pemda_rekomendasi") || "all");
  const [filterTahun, setFilterTahun] = useState("all");
  const [selectedNama, setSelectedNama] = useState(localStorage.getItem("selected_pemda_rekomendasi") || null);
  const [sort, setSort] = useState({ key: "nama_pemda", dir: "asc" });

  useEffect(() => {
    getPerbandingan()
      .then((d) => {
        setData(d.data);
        if (d.data.length > 0) {
          const stored = localStorage.getItem("selected_pemda_rekomendasi");
          setSelectedNama(stored || d.data[0].nama_pemda);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  // Sync selectedNama when filterNama changes (if it is a specific region)
  useEffect(() => {
    if (filterNama !== "all") {
      setSelectedNama(filterNama);
    }
  }, [filterNama]);

  const allNames = useMemo(() => [...new Set(data.map((d) => d.nama_pemda))].sort(), [data]);
  const allYears = useMemo(() => [...new Set(data.map((d) => d.tahun))].sort(), [data]);

  const filtered = useMemo(() => {
    let list = data.filter((d) =>
      (filterNama === "all" || d.nama_pemda === filterNama) &&
      (filterTahun === "all" || d.tahun === +filterTahun)
    );
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      if (key === "nama_pemda") return dir === "asc" ? a.nama_pemda.localeCompare(b.nama_pemda) : b.nama_pemda.localeCompare(a.nama_pemda);
      const va = key === "abs_selisih" ? Math.abs(a.ipm_prediksi - a.ipm_aktual) : a[key] ?? 0;
      const vb = key === "abs_selisih" ? Math.abs(b.ipm_prediksi - b.ipm_aktual) : b[key] ?? 0;
      return dir === "asc" ? va - vb : vb - va;
    });
  }, [data, filterNama, filterTahun, sort]);

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  }

  const mae = useMemo(() => {
    if (!filtered.length) return 0;
    return +(filtered.reduce((a, d) => a + Math.abs(d.ipm_prediksi - d.ipm_aktual), 0) / filtered.length).toFixed(2);
  }, [filtered]);
  const accuracy = +(Math.max(50, Math.min(99.9, 100 - mae * 12))).toFixed(1);

  const detailRows = useMemo(() =>
    data.filter((d) => d.nama_pemda === selectedNama).sort((a, b) => a.tahun - b.tahun),
    [data, selectedNama]
  );

  const maxAbs = useMemo(() => Math.max(...data.map((d) => Math.abs(d.ipm_prediksi - d.ipm_aktual)), 1), [data]);

  if (error) return <div className="page"><div className="container"><p style={{ color: "var(--rose)" }}>Error: {error}</p></div></div>;

  return (
    <div className="bg-surface text-text-main min-h-screen pt-8 pb-24">
      <div className="max-w-max-width mx-auto px-page-margin">
        
        {/* Upgraded Page Header */}
        <div className="premium-page-header">
          <div className="premium-page-header-glow" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="engine-badge">
                <span className="material-symbols-outlined text-[11px] align-middle mr-1">rule</span>
                MODEL VALIDATION
              </div>
              <h1 className="engine-title">Perbandingan Aktual vs Prediksi</h1>
              <p className="engine-desc">
                Validasi model terhadap data IPM 2014–2018 untuk seluruh 38 daerah ({data.length} observasi / 190 total observasi).
              </p>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant bg-surface-bright border border-border-subtle px-4 py-2 rounded-lg shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
              <span className="font-semibold">Fiscal Year 2024</span>
            </div>
          </div>
        </div>

        {/* Summary + Detail chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-8">
          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
            <div className="font-bold text-[14.5px] text-text-main mb-4">
              {filterNama === "all" ? "Akurasi Model Global" : `Akurasi Model (${filterNama})`}
            </div>
            {loading || !data.length ? <Skel w="100%" h="120px" /> : (
              <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
                <Donut value={+accuracy} max={100} suffix="%" label="akurasi" color="var(--primary)" />
                <div className="grid gap-3 flex-1">
                  <div>
                    <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                      {filterNama === "all" ? "MAE (Rata-rata Galat Absolut) Global" : "MAE (Rata-rata Galat Absolut) Lokal"}
                    </div>
                    <div className="text-xl font-bold text-text-main mt-0.5">{mae} <small className="text-xs text-text-muted font-normal">poin IPM</small></div>
                  </div>
                  <div>
                    <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider">Observasi Tervalidasi</div>
                    <div className="text-xl font-bold text-text-main mt-0.5">{filtered.length} <small className="text-xs text-text-muted font-normal">baris data</small></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="font-bold text-[14.5px] text-text-main">
                Detail: {selectedNama ?? "—"}
              </div>
              <div className="legend">
                <span className="lg-item flex items-center gap-1.5"><span className="lg-sw bg-text-main w-3 h-3 rounded" />Aktual</span>
                <span className="lg-item flex items-center gap-1.5"><span className="lg-sw bg-primary w-3 h-3 rounded" />Prediksi</span>
              </div>
            </div>
            {detailRows.length > 0 ? (
              <LineChart
                xLabels={detailRows.map((d) => String(d.tahun))}
                height={200}
                series={[
                  { label: "Aktual",  color: "var(--text)",    data: detailRows.map((d) => d.ipm_aktual),  fmt: (v) => v.toFixed(2) },
                  { label: "Prediksi", color: "var(--primary)", data: detailRows.map((d) => d.ipm_prediksi), fmt: (v) => v.toFixed(2) },
                ]}
              />
            ) : <Skel w="100%" h="200px" />}
            <div className="text-text-muted text-xs mt-2 flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>Klik baris pada tabel untuk mengganti daerah pada grafik.</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <section className="bg-surface-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          {/* Table Toolbar */}
          <div className="p-component-padding border-b border-border-subtle flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Select Daerah */}
              <div className="relative">
                <select 
                  className="appearance-none border border-border-subtle pl-10 pr-10 py-2 rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer bg-white w-[200px]"
                  value={filterNama} 
                  onChange={(e) => setFilterNama(e.target.value)}
                >
                  <option value="all">Semua Daerah</option>
                  {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">
                  location_city
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
                  arrow_drop_down
                </span>
              </div>

              {/* Select Tahun */}
              <div className="relative">
                <select 
                  className="appearance-none border border-border-subtle pl-10 pr-10 py-2 rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer bg-white w-[160px]"
                  value={filterTahun} 
                  onChange={(e) => setFilterTahun(e.target.value)}
                >
                  <option value="all">Semua Tahun</option>
                  {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">
                  calendar_today
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
                  arrow_drop_down
                </span>
              </div>

              <span className="bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-border-subtle">
                {filtered.length} Baris Data
              </span>
            </div>
            
            <div className="md:ml-auto text-xs text-text-muted font-bold tracking-wide">
              Selisih = Prediksi − Aktual
            </div>
          </div>

          {loading ? <SkeletonTable rows={9} /> : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none" onClick={() => toggleSort("nama_pemda")}>
                      <span className="inline-flex items-center">Daerah <SortIco active={sort.key === "nama_pemda"} dir={sort.dir} /></span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none" onClick={() => toggleSort("tahun")}>
                      <span className="inline-flex items-center">Tahun <SortIco active={sort.key === "tahun"} dir={sort.dir} /></span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none text-right" onClick={() => toggleSort("ipm_aktual")}>
                      <span className="inline-flex items-center justify-end w-full">IPM Aktual <SortIco active={sort.key === "ipm_aktual"} dir={sort.dir} /></span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none text-right" onClick={() => toggleSort("ipm_prediksi")}>
                      <span className="inline-flex items-center justify-end w-full">IPM Prediksi <SortIco active={sort.key === "ipm_prediksi"} dir={sort.dir} /></span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none text-right" onClick={() => toggleSort("abs_selisih")}>
                      <span className="inline-flex items-center justify-end w-full">Selisih <SortIco active={sort.key === "abs_selisih"} dir={sort.dir} /></span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle" style={{ width: 120 }}>Galat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((row, i) => {
                    const selisih = row.ipm_prediksi - row.ipm_aktual;
                    const absS = Math.abs(selisih);
                    return (
                      <tr 
                        key={i} 
                        onClick={() => setSelectedNama(row.nama_pemda)}
                        className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                          row.nama_pemda === selectedNama ? "bg-primary-fixed/20 hover:bg-primary-fixed/30" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-body-sm text-text-main font-semibold">{row.nama_pemda}</td>
                        <td className="px-6 py-4 font-body-sm text-text-main font-semibold">{row.tahun}</td>
                        <td className="px-6 py-4 font-body-sm text-text-main text-right">{row.ipm_aktual.toFixed(2)}</td>
                        <td className="px-6 py-4 font-body-sm text-primary text-right font-semibold">{row.ipm_prediksi.toFixed(2)}</td>
                        <td className={`px-6 py-4 font-body-sm text-right font-semibold ${
                          absS > 1.2 ? "text-rose-500" : selisih > 0 ? "text-emerald-500" : "text-text-main"
                        }`}>
                          {selisih > 0 ? "+" : ""}{selisih.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="cellbar" style={{ minWidth: 60 }}>
                            <span style={{ width: `${(absS / maxAbs) * 100}%`, background: absS > 1.2 ? "var(--rose)" : "var(--amber)" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
