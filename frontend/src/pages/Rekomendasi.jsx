import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAllPemda, getRekomendasi, getPemdaDetail } from "../services/api";
import Icon, { SEKTOR_ICON, SEKTOR_COLORS } from "../components/Icon";
import { AllocationChart } from "../components/Charts";
import { KlasterBadge, Skel } from "../components/UI";

const KLASTER_DESC = {
  0: "IPM tinggi, kemiskinan rendah. Fokus pada efisiensi & inovasi.",
  1: "Daerah metropolitan dengan PDRB tinggi. Benchmark alokasi terbaik.",
  2: "Capaian menengah. Akselerasi layanan publik & belanja modal.",
};

const RASIO_FIELDS = [
  ["rasio_pegawai_pct", "Pegawai"],
  ["rasio_modal_pct", "Modal"],
  ["rasio_barang_jasa_pct", "Barang & Jasa"],
  ["rasio_bansos_pct", "Bansos"],
  ["rasio_hibah_pct", "Hibah"],
  ["rasio_bantuan_keu_pct", "Bantuan Keuangan"],
];

export default function Rekomendasi() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pemdaList, setPemdaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    rasio_pegawai_pct: 45, rasio_modal_pct: 20, rasio_barang_jasa_pct: 18,
    rasio_bansos_pct: 1, rasio_hibah_pct: 3, rasio_bantuan_keu_pct: 8,
    ipm: 65, kemiskinan_pct: 15, pdrb_per_kapita: 25000,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllPemda().then((d) => {
      setPemdaList(d.data);
      const fromParam = searchParams.get("nama") || localStorage.getItem("selected_pemda_rekomendasi");
      if (fromParam) {
        const found = d.data.find((p) => p.nama_pemda === fromParam);
        if (found) handleSelectPemda(found.nama_pemda, d.data);
      }
    });
  }, []);

  async function handleSelectPemda(nama, list = pemdaList) {
    const p = list.find((d) => d.nama_pemda === nama);
    if (!p) { setSelected(null); return; }
    setSelected(p);
    localStorage.setItem("selected_pemda_rekomendasi", nama);
    setForm((f) => ({ ...f, ipm: p.ipm, kemiskinan_pct: p.kemiskinan_pct }));
    setAutoFilling(true);
    try {
      const detail = await getPemdaDetail(nama);
      const latest = detail.historis?.at(-1);
      if (latest) {
        setForm((f) => ({
          ...f,
          rasio_pegawai_pct: latest.rasio_pegawai_pct ?? f.rasio_pegawai_pct,
          rasio_modal_pct: latest.rasio_modal_pct ?? f.rasio_modal_pct,
          rasio_barang_jasa_pct: latest.rasio_barang_jasa_pct ?? f.rasio_barang_jasa_pct,
          ipm: latest.ipm ?? f.ipm,
          kemiskinan_pct: latest.kemiskinan_pct ?? f.kemiskinan_pct,
        }));
      }
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await getRekomendasi({ nama_pemda: selected.nama_pemda, tahun: 2018, ...form });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  const total = RASIO_FIELDS.reduce((s, [k]) => s + (form[k] ?? 0), 0);

  const targetChartData = useMemo(() => {
    if (!result) return [];
    return result.rekomendasi.map((r) => ({
      label: r.label,
      value: Math.max(0, (form[r.sektor] ?? 0) + r.gap_pct),
      color: SEKTOR_COLORS[r.sektor] ?? "#94a3b8",
    }));
  }, [result, form]);

  const top = result?.rekomendasi?.[0];
  const naik = result?.rekomendasi?.filter((x) => x.arah === "naik") ?? [];
  const turun = result?.rekomendasi?.filter((x) => x.arah === "turun") ?? [];

  return (
    <div className="bg-surface text-text-main min-h-screen pt-8 pb-24">
      <div className="max-w-max-width mx-auto px-page-margin">
        
        {/* Upgraded Page Header */}
        <div className="premium-page-header">
          <div className="premium-page-header-glow" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="engine-badge">
                <span className="material-symbols-outlined text-[11px] align-middle mr-1">tips_and_updates</span>
                DECISION SUPPORT SYSTEM
              </div>
              <h1 className="engine-title">Rekomendasi Alokasi</h1>
              <p className="engine-desc">
                Pilih daerah, sesuaikan profil belanja &amp; sosial-ekonomi, lalu lihat arah realokasi yang disarankan berdasarkan benchmark klaster terbaik.
              </p>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant bg-surface-bright border border-border-subtle px-4 py-2 rounded-lg shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
              <span className="font-semibold">Fiscal Year 2024</span>
            </div>
          </div>
        </div>

        {/* INPUTS SECTION: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Card 1 (Left): Initial conditions dropdown + 3 socio-economic inputs + "Hitung Rekomendasi" button */}
          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-body-sm font-bold text-text-main mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">location_city</span>
                  <span>Pilih Daerah</span>
                </div>
                <div className="relative">
                  <select 
                    className="appearance-none border border-border-subtle pl-10 pr-10 py-2.5 rounded-lg text-body-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer bg-white w-full"
                    value={selected?.nama_pemda ?? ""} 
                    onChange={(e) => handleSelectPemda(e.target.value)}
                  >
                    <option value="" disabled>-- Pilih kab/kota --</option>
                    {pemdaList.map((p) => (
                      <option key={p.nama_pemda} value={p.nama_pemda}>
                        {p.nama_pemda} — Klaster {p.klaster}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">
                    map
                  </span>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
                    arrow_drop_down
                  </span>
                </div>
                {selected && (
                  <div className="flex items-center gap-3 mt-3">
                    <KlasterBadge klaster={selected.klaster} />
                    <span className="text-text-muted text-[11.5px] leading-relaxed font-medium">{KLASTER_DESC[selected.klaster]}</span>
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-border-subtle" />

              <div>
                <div className="text-body-sm font-bold text-text-main mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                  <span>Indikator Sosial-Ekonomi</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[["ipm", "IPM"], ["kemiskinan_pct", "Kemiskinan %"], ["pdrb_per_kapita", "PDRB/kapita"]].map(([key, label]) => (
                    <div key={key} className="premium-input-box flex flex-col gap-1 hover:border-slate-300 transition-colors duration-150">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-primary">
                          {key === "ipm" ? "trending_up" :
                           key === "kemiskinan_pct" ? "person_off" : "monetization_on"}
                        </span>
                        {label}
                      </label>
                      <div className="relative mt-0.5">
                        <input 
                          className="w-full bg-transparent border-0 p-0 text-body-sm font-bold text-text-main focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          type="number" 
                          step="any" 
                          value={form[key]} 
                          onChange={(e) => setForm((f) => ({ ...f, [key]: +e.target.value }))} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button 
                className="btn-save-scenario" 
                onClick={handleSubmit} 
                disabled={!selected || loading || autoFilling}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {loading ? "hourglass_top" : "insights"}
                </span>
                <span>{loading ? "Menghitung…" : autoFilling ? "Mengisi data…" : "Hitung Rekomendasi"}</span>
              </button>
              {error && <p className="text-error text-xs mt-1">{error}</p>}
            </div>
          </div>

          {/* Card 2 (Right): Sector budget ratios (6 inputs in grid) + Dynamic progress bar indicating total sum percentage */}
          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm flex flex-col gap-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-body-sm font-bold text-text-main flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">percent</span>
                  <span>Rasio Belanja per Sektor</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  Math.abs(total - 100) < 5 ? "bg-success-bg text-success-muted border border-emerald-200" : "bg-danger-bg text-danger-muted border border-rose-200"
                }`}>
                  Total: {total.toFixed(1)}%
                </span>
              </div>
              <div className="sum-progress-bar mb-4">
                <div 
                  className="sum-progress-fill"
                  style={{ 
                    width: `${Math.min(100, total)}%`, 
                    backgroundColor: Math.abs(total - 100) < 5 ? "#10b981" : "#f43f5e" 
                  }} 
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {RASIO_FIELDS.map(([key, label]) => (
                  <div key={key} className="premium-input-box flex flex-col gap-1 hover:border-slate-300 transition-colors duration-150">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">
                        {key === "rasio_pegawai_pct" ? "school" :
                         key === "rasio_barang_jasa_pct" ? "medical_services" :
                         key === "rasio_modal_pct" ? "construction" :
                         key === "rasio_bansos_pct" ? "diversity_3" :
                         key === "rasio_hibah_pct" ? "eco" : "payments"}
                      </span>
                      {label}
                    </label>
                    <div className="relative mt-0.5">
                      <input 
                        className="w-full bg-transparent border-0 p-0 text-body-sm font-bold text-text-main focus:ring-0 focus:outline-none pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        type="number" 
                        step="0.5" 
                        min={0} 
                        max={100}
                        value={form[key]} 
                        onChange={(e) => setForm((f) => ({ ...f, [key]: +e.target.value }))} 
                      />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: Benchmark list or Computed Recommendations */}
        {!result ? (
          <div className="rekomendasi-placeholder-card shadow-sm animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary-fixed/30 text-primary flex items-center justify-center mb-4 border border-primary-fixed/20 shadow-sm animate-pulse">
              <span className="material-symbols-outlined text-[30px] font-bold">tips_and_updates</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Informasi Klaster & Target Anggaran</h3>
            <p className="text-body-sm text-text-muted max-w-[500px] mt-2 leading-relaxed">
              Pilih salah satu kabupaten/kota dari formulir di atas untuk menghitung gap realokasi terhadap benchmark klaster terbaik di Jawa Timur.
            </p>

            {/* Previews Cluster benchmarks instead of empty space */}
            <div className="cluster-info-grid">
              <div className="cluster-profile-mini-card">
                <div className="flex items-center justify-between mb-2">
                  <KlasterBadge klaster={0} />
                  <span className="text-[10px] font-bold text-text-muted">12 Daerah</span>
                </div>
                <div className="text-[12px] font-bold text-primary">C0 — High Growth</div>
                <p className="text-[11px] text-text-muted mt-1 leading-normal">Fokus efisiensi infrastruktur & biaya operasional.</p>
                <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-bold">
                  <span className="text-text-muted">Median IPM: 78.50</span>
                  <span className="text-rose-500">Poverty: 5.8%</span>
                </div>
              </div>

              <div className="cluster-profile-mini-card">
                <div className="flex items-center justify-between mb-2">
                  <KlasterBadge klaster={1} />
                  <span className="text-[10px] font-bold text-text-muted">1 Daerah</span>
                </div>
                <div className="text-[12px] font-bold text-primary">C1 — Developing</div>
                <p className="text-[11px] text-text-muted mt-1 leading-normal">Metro Kediri & PDRB tinggi, model layanan publik.</p>
                <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-bold">
                  <span className="text-text-muted">Median IPM: 73.20</span>
                  <span className="text-rose-500">Poverty: 10.2%</span>
                </div>
              </div>

              <div className="cluster-profile-mini-card">
                <div className="flex items-center justify-between mb-2">
                  <KlasterBadge klaster={2} />
                  <span className="text-[10px] font-bold text-text-muted">25 Daerah</span>
                </div>
                <div className="text-[12px] font-bold text-primary">C2 — Priority Support</div>
                <p className="text-[11px] text-text-muted mt-1 leading-normal">Dukungan alokasi bansos, hibah & layanan kesehatan dasar.</p>
                <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-bold">
                  <span className="text-text-muted">Median IPM: 66.40</span>
                  <span className="text-rose-500">Poverty: 14.8%</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            
            {/* Left Result Column: Narrative + Priority Bars */}
            <div className="flex flex-col gap-6">
              {/* Interpretasi (Narrative) */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm bg-gradient-to-tr from-primary-fixed/20 to-transparent">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-none">
                    <span className="material-symbols-outlined text-[20px]">insights</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-body-sm font-bold text-text-main">Interpretasi untuk {result.nama_pemda}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <KlasterBadge klaster={result.klaster_saat_ini} lg />
                      <span className="text-text-muted text-xs align-middle flex items-center font-bold">→ Target</span>
                      <KlasterBadge klaster={result.target_klaster} lg />
                      <span className="ml-auto text-xs text-text-main font-bold">
                        IPM Target: <strong>{result.ipm_target}</strong>
                      </span>
                    </div>
                    <p className="mt-3 text-body-sm text-text-muted leading-relaxed">
                      {top && <>Prioritas utama: <b>{top.arah === "naik" ? "naikkan" : "turunkan"} {top.label.toLowerCase()}</b> ({top.arah === "naik" ? "+" : "-"}{Math.abs(top.gap_pct).toFixed(2)} pp).</>}
                      {naik.length > 0 && <> Sektor disarankan <b>naik</b>: {naik.map((x) => x.label).join(", ")}.</>}
                      {turun.length > 0 && <> <b>Rasionalisasi</b>: {turun.map((x) => x.label.toLowerCase()).join(", ")}.</>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority bars */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="table-title">Prioritas Realokasi</h3>
                  <div className="legend">
                    <span className="lg-item"><span className="lg-sw bg-emerald-500" />Tingkatkan</span>
                    <span className="lg-item"><span className="lg-sw bg-rose-500" />Kurangi</span>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  {result.rekomendasi.map((x, i) => {
                    const w = Math.min(48, Math.abs(x.gap_pct) * 3.5);
                    const cls = x.arah === "naik" ? "up" : "down";
                    return (
                      <div className="prio-row" key={x.sektor}>
                        <div className="prio-name flex items-center gap-2">
                          <span className={`pico text-[20px] material-symbols-outlined ${x.arah === "naik" ? "text-emerald-500" : "text-rose-500"}`}>
                            {x.sektor === "rasio_pegawai_pct" ? "school" :
                             x.sektor === "rasio_barang_jasa_pct" ? "medical_services" :
                             x.sektor === "rasio_modal_pct" ? "construction" :
                             x.sektor === "rasio_bansos_pct" ? "diversity_3" :
                             x.sektor === "rasio_hibah_pct" ? "eco" : "payments"}
                          </span>
                          <div>
                            <div className="text-body-sm font-bold text-text-main">{x.label}</div>
                            <div className="text-[11.5px] text-text-muted font-semibold">
                              {(form[x.sektor] ?? 0).toFixed(1)}% → {Math.max(0, (form[x.sektor] ?? 0) + x.gap_pct).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="prio-track">
                          <div className="prio-axis" />
                          <div className={`prio-fill ${cls}`} style={{ width: `${w}%`, left: cls === "down" ? `${50 - w}%` : "50%", animationDelay: `${i * 0.05}s` }} />
                        </div>
                        <span className={`prio-tag ${cls} flex items-center gap-1 text-xs font-bold justify-end min-w-[120px]`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {x.arah === "naik" ? "arrow_upward" : "arrow_downward"}
                          </span>
                          {x.arah === "naik" ? "Tingkatkan" : "Kurangi"}
                          <span className="tabular-nums font-semibold">({x.arah === "naik" ? "+" : "-"}{Math.abs(x.gap_pct).toFixed(2)} pp)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Result Column: Allocation Pie Chart + Link to simulator */}
            <div className="flex flex-col gap-6">
              {/* Allocation chart */}
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="font-bold text-[13.5px] text-text-main mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
                    <span>Komposisi Alokasi yang Direkomendasikan</span>
                  </div>
                  <AllocationChart data={targetChartData} />
                </div>
                <button 
                  className="btn w-full justify-center mt-6 h-[42px] text-[13px] font-semibold"
                  onClick={() => {
                    const recommendedRatios = {};
                    result.rekomendasi.forEach((r) => {
                      recommendedRatios[r.sektor] = Math.max(0, (form[r.sektor] ?? 0) + r.gap_pct);
                    });
                    navigate("/simulasi", {
                      state: {
                        nama_pemda: selected?.nama_pemda || "",
                        initialCtx: {
                          ipm_lag1: form.ipm,
                          kemiskinan_lag1: form.kemiskinan_pct,
                          pdrb_per_kapita: form.pdrb_per_kapita
                        },
                        initialRasio: {
                          rasio_pegawai_pct: form.rasio_pegawai_pct,
                          rasio_modal_pct: form.rasio_modal_pct,
                          rasio_barang_jasa_pct: form.rasio_barang_jasa_pct,
                          rasio_bansos_pct: form.rasio_bansos_pct,
                          rasio_hibah_pct: form.rasio_hibah_pct,
                          rasio_bantuan_keu_pct: form.rasio_bantuan_keu_pct,
                        },
                        recommendedRasio: recommendedRatios,
                        ipm_target: result.ipm_target
                      }
                    });
                  }}
                >
                  <span className="material-symbols-outlined text-[18px] mr-1">sliders</span>
                  Uji di Simulator Dampak
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

