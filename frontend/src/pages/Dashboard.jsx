import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPemda, getClusterInfo } from "../services/api";
import Icon from "../components/Icon";
import { CountUp, KlasterBadge, Skel, SkeletonTable, useLoad } from "../components/UI";

const SortIco = ({ active, dir }) => (
  <span className="inline-flex flex-col ml-1.5 align-middle opacity-55">
    <Icon name="chevDown" size={9} style={{ transform: "rotate(180deg)", marginBottom: -1, opacity: active && dir === "asc" ? 1 : .3 }} />
    <Icon name="chevDown" size={9} style={{ opacity: active && dir === "desc" ? 1 : .3 }} />
  </span>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const loading = useLoad(600);
  const [pemda, setPemda] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [q, setQ] = useState("");
  const [cluster, setCluster] = useState("all");
  const [sort, setSort] = useState({ key: "ipm", dir: "desc" });
  const [error, setError] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    Promise.all([getAllPemda(), getClusterInfo()])
      .then(([p, c]) => { setPemda(p.data); setClusters(c.data); })
      .catch((e) => setError(e.message));
  }, []);

  const avgIPM = pemda.length ? (pemda.reduce((a, b) => a + b.ipm, 0) / pemda.length).toFixed(2) : "0.00";
  const avgKem = pemda.length ? (pemda.reduce((a, b) => a + b.kemiskinan_pct, 0) / pemda.length).toFixed(2) : "0.00";

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "nama_pemda" ? "asc" : "desc" });
    setCurrentPage(1); // reset pagination to first page
  }

  const filteredAndSortedRows = useMemo(() => {
    let list = pemda.filter((r) =>
      (cluster === "all" || r.klaster === +cluster) &&
      r.nama_pemda.toLowerCase().includes(q.toLowerCase())
    );
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      if (key === "nama_pemda") return dir === "asc" ? a.nama_pemda.localeCompare(b.nama_pemda) : b.nama_pemda.localeCompare(a.nama_pemda);
      return dir === "asc" ? a[key] - b[key] : b[key] - a[key];
    });
  }, [pemda, q, cluster, sort]);

  // Paginated list
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedRows, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize) || 1;

  function exportCSV() {
    if (!pemda.length) return;
    const headers = ["Nama Pemda", "Klaster", "IPM", "Kemiskinan (%)", "Tahun"];
    const csvRows = [
      headers.join(","),
      ...filteredAndSortedRows.map(r => `"${r.nama_pemda}",${r.klaster},${r.ipm.toFixed(2)},${r.kemiskinan_pct.toFixed(2)},${r.tahun_terakhir}`)
    ];
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `apbd_jatim_dashboard_data.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (error) return <div className="page"><div className="container"><p className="text-danger-muted">Error: {error}</p></div></div>;

  return (
    <div className="bg-surface text-text-main min-h-screen pt-8 pb-24">
      <div className="max-w-max-width mx-auto px-page-margin">
        
        {/* Upgraded Page Header */}
        <div className="premium-page-header">
          <div className="premium-page-header-glow" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="engine-badge">
                <span className="material-symbols-outlined text-[11px] align-middle mr-1">monitoring</span>
                EXECUTIVE OVERVIEW
              </div>
              <h1 className="engine-title">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant bg-surface-bright border border-border-subtle px-4 py-2 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
              <span className="font-semibold">Fiscal Year 2024</span>
            </div>
          </div>
        </div>

        {/* Summary Metrics Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-section-gap">
          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="bg-surface-white border border-border-subtle p-component-padding rounded-lg">
                <Skel w="30px" h="30px" r={8} />
                <Skel w="80px" h="10px" style={{ marginTop: "16px" }} />
                <Skel w="110px" h="30px" style={{ marginTop: "8px" }} />
              </div>
            ))
          ) : (
            <>
              {/* Metric Card 1: AVERAGE IPM */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg transition-all hover:-translate-y-0.5 duration-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary-fixed text-primary rounded-lg">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <span className="text-success-muted font-label-caps text-label-caps">+1.2% vs Prev</span>
                </div>
                <p className="font-label-caps text-label-caps text-text-muted mb-1">AVERAGE IPM</p>
                <h2 className="font-metric-value text-metric-value text-text-main">
                  <CountUp value={+avgIPM} decimals={2} />
                </h2>
                <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(+avgIPM).toFixed(1)}%` }}></div>
                </div>
              </div>

              {/* Metric Card 2: POVERTY RATE */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg transition-all hover:-translate-y-0.5 duration-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-danger-bg text-error rounded-lg">
                    <span className="material-symbols-outlined">person_off</span>
                  </div>
                  <span className="text-danger-muted font-label-caps text-label-caps">-0.4% Improvement</span>
                </div>
                <p className="font-label-caps text-label-caps text-text-muted mb-1">POVERTY RATE</p>
                <h2 className="font-metric-value text-metric-value text-text-main">
                  <CountUp value={+avgKem} decimals={2} />%
                </h2>
                <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-error" style={{ width: `${(+avgKem).toFixed(1)}%` }}></div>
                </div>
              </div>

              {/* Metric Card 3: TOTAL DISTRICTS */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg transition-all hover:-translate-y-0.5 duration-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-secondary-container text-on-secondary-container rounded-lg">
                    <span className="material-symbols-outlined">location_city</span>
                  </div>
                </div>
                <p className="font-label-caps text-label-caps text-text-muted mb-1">TOTAL DISTRICTS</p>
                <h2 className="font-metric-value text-metric-value text-text-main">
                  <CountUp value={pemda.length} />
                </h2>
                <p className="mt-4 text-body-sm text-text-muted">Kabupaten & Kota Terdata</p>
              </div>
            </>
          )}
        </div>

        {/* Main Data Table Section */}
        <section className="bg-surface-white border border-border-subtle rounded-xl overflow-hidden shadow-sm mb-section-gap">
          {/* Table Controls */}
          <div className="p-component-padding border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Daftar Daerah</h3>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary">
                  search
                </span>
                <input 
                  className="pl-10 pr-4 py-2 border border-border-subtle rounded-lg text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-full md:w-64 transition-all" 
                  placeholder="Search district..." 
                  value={q} 
                  onChange={(e) => { setQ(e.target.value); setCurrentPage(1); }}
                  type="text"
                />
              </div>
              <div className="relative">
                <select 
                  className="appearance-none border border-border-subtle pl-10 pr-10 py-2 rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer bg-white"
                  value={cluster} 
                  onChange={(e) => { setCluster(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">Semua Klaster</option>
                  <option value="0">C0 — High Growth</option>
                  <option value="1">C1 — Developing</option>
                  <option value="2">C2 — Priority</option>
                </select>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">
                  filter_list
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
                  arrow_drop_down
                </span>
              </div>
              <button 
                className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-body-sm font-semibold hover:bg-primary hover:text-white transition-colors"
                onClick={exportCSV}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* The Table */}
          {loading ? (
            <SkeletonTable rows={pageSize} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th 
                      className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none"
                      onClick={() => toggleSort("nama_pemda")}
                    >
                      <span className="inline-flex items-center">
                        DISTRICT NAME <SortIco active={sort.key === "nama_pemda"} dir={sort.dir} />
                      </span>
                    </th>
                    <th 
                      className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none text-right"
                      onClick={() => toggleSort("ipm")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        IPM INDEX <SortIco active={sort.key === "ipm"} dir={sort.dir} />
                      </span>
                    </th>
                    <th 
                      className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle sortable cursor-pointer select-none text-right"
                      onClick={() => toggleSort("kemiskinan_pct")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        POVERTY (%) <SortIco active={sort.key === "kemiskinan_pct"} dir={sort.dir} />
                      </span>
                    </th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle">CLUSTER</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-text-muted border-b border-border-subtle text-right" style={{ width: "80px" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-text-muted">
                        Tidak ada kabupaten/kota ditemukan.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r) => (
                      <tr 
                        key={r.nama_pemda} 
                        className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                        onClick={() => navigate(`/daerah/${encodeURIComponent(r.nama_pemda)}`)}
                      >
                        <td className="px-6 py-4 font-body-sm text-text-main font-semibold">
                          {r.nama_pemda}
                        </td>
                        <td className="px-6 py-4 font-body-sm text-text-main text-right">
                          {r.ipm.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-body-sm text-text-main text-right">
                          {r.kemiskinan_pct.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4">
                          <KlasterBadge klaster={r.klaster} />
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="text-text-muted hover:text-primary transition-colors"
                            onClick={() => navigate(`/daerah/${encodeURIComponent(r.nama_pemda)}`)}
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-border-subtle bg-surface-bright flex-wrap gap-4">
              <span className="text-body-sm text-text-muted">
                Showing {filteredAndSortedRows.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredAndSortedRows.length)} of {filteredAndSortedRows.length} entries
              </span>
              <div className="flex gap-2">
                <button 
                  className="p-2 border border-border-subtle rounded hover:bg-surface-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`px-3 py-1 border rounded font-body-sm transition-colors ${
                      currentPage === idx + 1 
                        ? "bg-primary-container text-on-primary-container border-primary-container font-semibold" 
                        : "border-border-subtle hover:bg-surface-white text-text-main"
                    }`}
                    onClick={() => setCurrentPage(idx + 1)}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  className="p-2 border border-border-subtle rounded hover:bg-surface-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Information / Help Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg">
            <h4 className="font-headline-md text-headline-md text-primary mb-2">Cluster Definitions</h4>
            <p className="text-body-sm text-on-secondary-container mb-4">Understanding how districts are segmented for budget recommendations based on the fiscal model.</p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="px-2 py-0.5 h-fit rounded text-[10px] font-bold bg-primary-fixed text-on-primary-fixed-variant">C0</span>
                <div className="text-body-sm">
                  <p className="font-bold text-primary">High Growth / High IPM</p>
                  <p className="text-text-muted">Mature economic centers requiring maintenance and strategic investments.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="px-2 py-0.5 h-fit rounded text-[10px] font-bold bg-secondary-container text-on-secondary-fixed-variant">C1</span>
                <div className="text-body-sm">
                  <p className="font-bold text-primary">Developing / Emerging</p>
                  <p className="text-text-muted">Regions with rapid improvement in basic infrastructure and public services.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="px-2 py-0.5 h-fit rounded text-[10px] font-bold bg-secondary-fixed-dim text-on-secondary-fixed">C2</span>
                <div className="text-body-sm">
                  <p className="font-bold text-primary">Priority Support Required</p>
                  <p className="text-text-muted">Higher poverty indicators needing direct intervention and basic welfare funding.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="relative rounded-xl overflow-hidden min-h-[300px]">
            <img 
              alt="Map of East Java" 
              className="absolute inset-0 w-full h-full object-cover grayscale" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_ym8NusXKDnZh0wDPotXSoYSpgC0PKXJgy3r6bX_Y1X8yJBNoFFW2DehueB4QkVm3mFG7qSEKoQoGx1RmfUDxvFMv-pu8BJtxWuRjwmBGqzHLEWE3GFRCrgEqKYkaBcw9fOf0NKCKqp9XMohlrTzEt9mDU9JxukpDrRtC8BiFcKhC6cW5XL9pAROw3NXMdHWDWyNILk-xfJQTW2EAxyXsnAJspBqTU1gvY6C9vVVh7YRUvSv-TD-RSnPAqVUW-F_PY4XOYspErA"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-text-main/80 to-transparent flex items-end p-6">
              <div className="text-white">
                <h4 className="font-headline-md text-headline-md mb-1">Geospatial Distribution</h4>
                <p className="text-body-sm opacity-90">Visual tracking of cluster concentrations across East Java.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

