import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPemdaDetail } from "../services/api";
import Icon from "../components/Icon";
import { LineChart, BarChart, AllocationChart } from "../components/Charts";
import { KlasterBadge, CountUp, Skel, useLoad } from "../components/UI";
import { formatRupiah, formatAngka } from "../utils/formatters";

const ACCENT = { 0: "#059669", 1: "#d97706", 2: "#4f46e5" };

const RASIO_COLORS = {
  rasio_pegawai_pct: "#94a3b8",
  rasio_modal_pct:   "#4f46e5",
  rasio_barang_jasa_pct: "#0ea5e9",
};

export default function DetailDaerah() {
  const { nama } = useParams();
  const navigate = useNavigate();
  const loading = useLoad(500);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("tren");
  const [error, setError] = useState(null);

  useEffect(() => {
    getPemdaDetail(decodeURIComponent(nama))
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [nama]);

  const latest = useMemo(() => detail?.historis?.at(-1), [detail]);
  const first  = useMemo(() => detail?.historis?.[0], [detail]);

  const ipmGrowth   = latest && first ? (latest.ipm - first.ipm).toFixed(2) : null;
  const povGrowth   = latest && first ? (first.kemiskinan_pct - latest.kemiskinan_pct).toFixed(2) : null;
  const accent      = detail ? ACCENT[detail.klaster] ?? "#4f46e5" : "#4f46e5";

  const barData = useMemo(() => {
    if (!detail) return [];
    return detail.historis.map((h) => ({
      label: String(h.tahun),
      value: h.rasio_pegawai_pct ?? 0,
      color: RASIO_COLORS.rasio_pegawai_pct,
    }));
  }, [detail]);

  const sectorData = useMemo(() => {
    if (!latest) return [];
    return [
      { label: "Pegawai",      value: latest.rasio_pegawai_pct ?? 0,   color: RASIO_COLORS.rasio_pegawai_pct },
      { label: "Modal",        value: latest.rasio_modal_pct ?? 0,      color: RASIO_COLORS.rasio_modal_pct },
      { label: "Brg & Jasa",  value: latest.rasio_barang_jasa_pct ?? 0, color: RASIO_COLORS.rasio_barang_jasa_pct },
    ];
  }, [latest]);

  if (error) return (
    <div className="page"><div className="container">
      <p style={{ color: "var(--rose)" }}>Error: {error}</p>
    </div></div>
  );

  return (
    <div className="bg-surface text-text-main min-h-screen pt-8 pb-24">
      <div className="max-w-max-width mx-auto px-page-margin">
        
        {/* Back Button */}
        <button 
          className="btn flex items-center gap-2 mb-6 text-body-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors"
          onClick={() => navigate("/")}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Kembali ke Dashboard</span>
        </button>

        {/* HERO CARD */}
        <div className="relative overflow-hidden text-white rounded-xl p-8 mb-6 shadow-lg" style={{ background: `linear-gradient(135deg, ${accent} 0%, #0f172a 130%)` }}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,#ffffff_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 border border-white/20 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                <span>{detail?.nama_pemda?.startsWith("Kota") ? "Kota" : "Kabupaten"} · Jawa Timur</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">
                {detail?.nama_pemda ?? nama}
              </h1>
              <div className="flex flex-wrap gap-2">
                {detail && <KlasterBadge klaster={detail.klaster} lg />}
                {latest && <span className="bg-white/10 text-white border border-white/25 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">trending_up</span> IPM {latest.ipm?.toFixed(2)}</span>}
                {latest && <span className="bg-white/10 text-white border border-white/25 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person_off</span> Kemiskinan {latest.kemiskinan_pct?.toFixed(2)}%</span>}
              </div>
            </div>
            <button 
              className="bg-white text-primary hover:bg-slate-50 px-5 py-2.5 rounded-lg text-body-sm font-bold flex items-center gap-2 shadow-md transition-colors"
              onClick={() => navigate(`/rekomendasi?nama=${encodeURIComponent(detail?.nama_pemda ?? "")}`)}
            >
              <span className="material-symbols-outlined text-[18px]">tips_and_updates</span>
              <span>Lihat Rekomendasi</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>IPM Terakhir (2018)</span>
              </div>
              <div className="text-3xl font-extrabold mt-1">
                {latest ? <CountUp value={latest.ipm} decimals={2} /> : "—"}
              </div>
              {ipmGrowth && (
                <div className="text-xs text-emerald-300 mt-2 flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                  <span>+{ipmGrowth} sejak 2014</span>
                </div>
              )}
            </div>
            
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">person_off</span>
                <span>Kemiskinan</span>
              </div>
              <div className="text-3xl font-extrabold mt-1">
                {latest ? <CountUp value={latest.kemiskinan_pct} decimals={2} /> : "—"}%
              </div>
              {povGrowth && (
                <div className="text-xs text-emerald-300 mt-2 flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                  <span>-{povGrowth} pp sejak 2014</span>
                </div>
              )}
            </div>
            
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">payments</span>
                <span>Belanja Total (2018)</span>
              </div>
              <div className="text-xl font-extrabold mt-2 leading-none">
                {latest?.belanja_total ? `Rp ${latest.belanja_total.toFixed(0)} M` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* TABS CONTAINER */}
        <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
          <div className="flex gap-6 border-b border-border-subtle mb-6">
            {[["tren", "Tren", "trending_up"], ["belanja", "Belanja", "payments"], ["data", "Data Historis", "table_chart"]].map(([k, lb, ic]) => (
              <button 
                key={k} 
                className={`pb-3 px-1 font-semibold text-body-sm relative transition-colors ${
                  tab === k ? "text-primary" : "text-text-muted hover:text-text-main"
                }`}
                onClick={() => setTab(k)}
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">{ic}</span>
                  {lb}
                </span>
                {tab === k && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {loading || !detail ? <Skel w="100%" h="240px" r={12} /> : (
            <>
              {tab === "tren" && (
                <div className="anim-in">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2 text-xs text-text-muted font-bold">
                    <div className="legend">
                      <span className="lg-item flex items-center gap-1.5"><span className="lg-sw bg-primary w-3 h-3 rounded" />IPM</span>
                      <span className="lg-item flex items-center gap-1.5"><span className="lg-sw bg-rose-500 w-3 h-3 rounded" />Kemiskinan (%)</span>
                    </div>
                    <span>Tahun Data 2014–2018</span>
                  </div>
                  <LineChart
                    xLabels={detail.historis.map((h) => String(h.tahun))}
                    height={250}
                    series={[
                      { label: "IPM", color: "var(--primary)", data: detail.historis.map((h) => h.ipm ?? 0), fmt: (v) => v.toFixed(2) },
                      { label: "Kemiskinan", color: "var(--rose)", data: detail.historis.map((h) => h.kemiskinan_pct ?? 0), fmt: (v) => v.toFixed(2) + "%" },
                    ]}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-primary-fixed/20 rounded-xl">
                      <div className="flex items-center gap-2 text-primary font-bold text-body-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_up</span> 
                        <span>IPM naik {ipmGrowth} poin (2014–2018)</span>
                      </div>
                      <div className="text-text-muted text-xs mt-1.5 leading-relaxed font-semibold">
                        Rata-rata +{ipmGrowth ? (ipmGrowth / 4).toFixed(2) : "—"} poin per tahun.
                      </div>
                    </div>
                    <div className="p-4 bg-danger-bg rounded-xl">
                      <div className="flex items-center gap-2 text-error font-bold text-body-sm">
                        <span className="material-symbols-outlined text-[18px]">trending_down</span> 
                        <span>Kemiskinan turun {povGrowth} pp</span>
                      </div>
                      <div className="text-text-muted text-xs mt-1.5 leading-relaxed font-semibold">
                        Dari {first?.kemiskinan_pct?.toFixed(2)}% (2014) → {latest?.kemiskinan_pct?.toFixed(2)}% (2018).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "belanja" && (
                <div className="anim-in grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="font-bold text-text-main mb-3 text-body-sm">Rasio Belanja Pegawai per Tahun</div>
                    <BarChart
                      height={200}
                      data={detail.historis.map((h) => ({
                        label: String(h.tahun),
                        value: h.rasio_pegawai_pct ? +h.rasio_pegawai_pct.toFixed(1) : 0,
                        color: "#94a3b8",
                      }))}
                    />
                    <div className="mt-4 p-3 bg-surface-container rounded-lg text-xs text-text-muted leading-relaxed flex items-start gap-1.5 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-primary flex-none mt-0.5">info</span>
                      <span>
                        Rasio belanja modal {latest?.rasio_modal_pct?.toFixed(1)}%
                        {latest?.rasio_modal_pct < 18 ? " masih di bawah ideal — perlu didorong untuk pembangunan." : " tergolong sehat untuk mendorong pertumbuhan."}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-text-main mb-3 text-body-sm">Komposisi Belanja 3 Komponen (2018)</div>
                    <AllocationChart data={sectorData} />
                  </div>
                </div>
              )}

              {tab === "data" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        <th className="px-4 py-3 border-b border-border-subtle">Tahun</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">IPM</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Kemiskinan</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Pendapatan</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Belanja Total</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Rasio Pegawai</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Rasio Modal</th>
                        <th className="px-4 py-3 border-b border-border-subtle text-right">Brg & Jasa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-body-sm text-text-main">
                      {detail.historis.map((h) => (
                        <tr key={h.tahun} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3 font-bold">{h.tahun}</td>
                          <td className="px-4 py-3 text-right font-semibold">{h.ipm?.toFixed(2) ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">{h.kemiskinan_pct?.toFixed(2) ?? "—"}%</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatRupiah(h.pendapatan_total)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatRupiah(h.belanja_total)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatAngka(h.rasio_pegawai_pct)}%</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatAngka(h.rasio_modal_pct)}%</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatAngka(h.rasio_barang_jasa_pct)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

