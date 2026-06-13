import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { runSimulasi } from "../services/api";
import Icon from "../components/Icon";
import { BarChart } from "../components/Charts";
import { CountUp } from "../components/UI";

const PRESETS = [
  {
    id: "modal", name: "Fokus Belanja Modal", color: "#4f46e5",
    desc: "Tingkatkan infrastruktur dan aset daerah untuk pertumbuhan jangka panjang.",
    rasio: { rasio_pegawai_pct: 34, rasio_modal_pct: 28, rasio_barang_jasa_pct: 22, rasio_bansos_pct: 1.5, rasio_hibah_pct: 4, rasio_bantuan_keu_pct: 2 },
  },
  {
    id: "layanan", name: "Efisiensi Layanan Publik", color: "#0ea5e9",
    desc: "Optimalkan barang & jasa untuk peningkatan IPM secara langsung.",
    rasio: { rasio_pegawai_pct: 36, rasio_modal_pct: 20, rasio_barang_jasa_pct: 28, rasio_bansos_pct: 2, rasio_hibah_pct: 5, rasio_bantuan_keu_pct: 2 },
  },
  {
    id: "efisiensi", name: "Efisiensi Birokrasi", color: "#059669",
    desc: "Pangkas pegawai & bantuan keuangan, fokus ke belanja produktif.",
    rasio: { rasio_pegawai_pct: 32, rasio_modal_pct: 24, rasio_barang_jasa_pct: 25, rasio_bansos_pct: 2.5, rasio_hibah_pct: 6, rasio_bantuan_keu_pct: 1 },
  },
];

const SEKTORS = [
  { key: "rasio_pegawai_pct",     label: "PENDIDIKAN" },
  { key: "rasio_barang_jasa_pct", label: "KESEHATAN" },
  { key: "rasio_modal_pct",       label: "PEKERJAAN UMUM" },
  { key: "rasio_bansos_pct",      label: "SOSIAL" },
  { key: "rasio_hibah_pct",       label: "LINGKUNGAN" },
  { key: "rasio_bantuan_keu_pct", label: "EKONOMI" },
];

const DEFAULT_RASIO = { rasio_pegawai_pct: 45, rasio_modal_pct: 20, rasio_barang_jasa_pct: 18, rasio_bansos_pct: 1, rasio_hibah_pct: 3, rasio_bantuan_keu_pct: 8 };
const DEFAULT_CTX   = { ipm_lag1: 65, kemiskinan_lag1: 15, pdrb_per_kapita: 25000 };

export default function Simulasi() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state;

  const [rasio, setRasio] = useState(stateData?.recommendedRasio || DEFAULT_RASIO);
  const [ctx, setCtx] = useState(stateData?.initialCtx || DEFAULT_CTX);
  const [preset, setPreset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scenarioSaved, setScenarioSaved] = useState(false);

  const total = SEKTORS.reduce((s, { key }) => s + (rasio[key] ?? 0), 0);
  const dIPM = result ? +(result.prediksi_ipm - ctx.ipm_lag1).toFixed(2) : 0;
  const dPov = result ? +(result.prediksi_kemiskinan - ctx.kemiskinan_lag1).toFixed(2) : 0;

  function applyPreset(p) {
    setPreset(p.id);
    setRasio({ ...p.rasio });
  }

  // Reactive Simulation Trigger (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleRun();
    }, 150);
    return () => clearTimeout(delayDebounceFn);
  }, [rasio, ctx]);

  async function handleRun() {
    setLoading(true); setError(null);
    try {
      const res = await runSimulasi({ ...rasio, ...ctx });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveScenario() {
    setScenarioSaved(true);
    setTimeout(() => setScenarioSaved(false), 3000);
  }

  const currentDateStr = useMemo(() => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('id-ID', options);
  }, []);

  return (
    <div className="bg-surface text-text-main min-h-screen pt-8 pb-24">
      <div className="max-w-max-width mx-auto px-page-margin">
        
        {/* Upgraded Page Header */}
        <div className="premium-page-header">
          <div className="premium-page-header-glow" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="engine-badge">
                <span className="material-symbols-outlined text-[11px] align-middle mr-1">settings_suggest</span>
                SIMULATION ENGINE
              </div>
              <h1 className="engine-title">Simulasi Anggaran</h1>
              <p className="engine-desc">
                Sesuaikan alokasi sektor untuk melihat prediksi dampak terhadap indikator makro pembangunan Jawa Timur.
              </p>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant bg-surface-bright border border-border-subtle px-4 py-2 rounded-lg shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
              <span className="font-semibold">Fiscal Year 2024</span>
            </div>
          </div>
        </div>

        {/* Presets Row */}
        <div className="preset-row mb-6">
          {PRESETS.map((p) => (
            <button 
              key={p.id} 
              className={`preset ${preset === p.id ? "on" : ""}`} 
              onClick={() => applyPreset(p)}
            >
              <div className="p-name">
                <span className="pdot mr-2" style={{ background: p.color }} />
                {p.name}
              </div>
              <div className="p-desc mt-1">{p.desc}</div>
            </button>
          ))}
        </div>

        {/* MAIN SIMULATOR GRID */}
        <div className="sim-grid">
          
          {/* LEFT COLUMN: Controls Card */}
          <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm flex flex-col gap-6">
            
            {/* Context Inputs (Kondisi Awal Daerah) */}
            <div>
              <div className="text-body-sm font-bold text-text-main mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">location_city</span>
                <span>Kondisi Awal Daerah</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  ["ipm_lag1", "IPM Awal", 50, 90], 
                  ["kemiskinan_lag1", "Kemiskinan (%)", 1, 30], 
                  ["pdrb_per_kapita", "PDRB/kapita (Juta Rp)", 5000, 400000]
                ].map(([key, label, mn, mx]) => (
                  <div key={key}>
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">{label}</label>
                    <input 
                      className="input" 
                      type="number" 
                      min={mn} 
                      max={mx} 
                      step="0.1" 
                      value={ctx[key]} 
                      onChange={(e) => setCtx((c) => ({ ...c, [key]: +e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-border-subtle" />

            {/* Allocation Sliders */}
            <div>
              <div className="text-body-sm font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">percent</span>
                <span>Alokasi Anggaran Sektoral</span>
              </div>
              
              <div className="flex flex-col gap-4">
                {SEKTORS.map(({ key, label }) => (
                  <div className="field" key={key}>
                    <div className="field-label flex justify-between items-center mb-1">
                      <span className="text-[11.5px] font-bold text-text-main tracking-wider">
                        {label}
                      </span>
                      <span className="val text-body-sm font-bold text-primary">{(rasio[key] ?? 0).toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="rng" 
                      min="0" 
                      max="70" 
                      step="0.5" 
                      value={rasio[key] ?? 0}
                      onChange={(e) => { setRasio((r) => ({ ...r, [key]: +e.target.value })); setPreset(null); }} 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Total Meter */}
            <div className={`total-meter ${Math.abs(total - 100) < 5 ? "ok" : "off"}`}>
              <span className="material-symbols-outlined text-[20px]">
                {Math.abs(total - 100) < 5 ? "check_circle" : "info"}
              </span>
              <div className="flex-1">
                <div className="text-[11px] text-text-muted font-semibold">Total Alokasi</div>
                <div className="tm-val text-lg font-bold">{total.toFixed(1)}%</div>
              </div>
              <span className="text-text-muted text-[11.5px] max-w-[180px] text-right">
                {Math.abs(total - 100) < 5 ? "Komposisi seimbang" : "Sisa dialokasikan ke komponen lain"}
              </span>
            </div>
            
            {error && <p className="text-error text-[12.5px] m-0">{error}</p>}
          </div>

          {/* RIGHT COLUMN: Results Card */}
          <div className="sticky top-20 flex flex-col gap-6">
            
            {/* Result Header Box */}
            <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
              <h2 className="table-title mb-4">Hasil Prediksi</h2>
              
              {!result ? (
                <div className="grid place-items-center min-h-[180px] text-text-muted text-center">
                  <div>
                    <span className="material-symbols-outlined text-[36px] text-text-muted opacity-40 mb-2">hourglass_empty</span>
                    <div className="font-bold text-text-main text-body-sm">Memuat model prediksi...</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    
                    {/* IPM Prediction Box */}
                    <div className="prediction-box good">
                      <div className="kpi-header mb-1">
                        <span className="prediction-title">Prediksi IPM</span>
                        <span className="kpi-badge success">
                          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        </span>
                      </div>
                      <div className="prediction-value success">
                        Delta {dIPM >= 0 ? "+" : ""}{dIPM}
                      </div>
                      <div className="prediction-subtext mt-1">
                        {dIPM >= 0 
                          ? "Peningkatan signifikan pada rata-rata pembangunan manusia." 
                          : "Penyusutan alokasi memicu perlambatan indeks pembangunan."}
                      </div>
                    </div>

                    {/* Poverty Prediction Box */}
                    <div className="prediction-box warn">
                      <div className="kpi-header mb-1">
                        <span className="prediction-title">Angka Kemiskinan</span>
                        <span className="kpi-badge danger">
                          <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                        </span>
                      </div>
                      <div className="prediction-value danger">
                        Delta {dPov >= 0 ? "+" : ""}{dPov}%
                      </div>
                      <div className="prediction-subtext mt-1">
                        Efek langsung dari penguatan jaringan jaminan sosial dan ekonomi.
                      </div>
                    </div>

                  </div>

                  <button className="btn-save-scenario mt-4" onClick={handleSaveScenario}>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>{scenarioSaved ? "Skenario Berhasil Disimpan" : "Simpan Skenario"}</span>
                  </button>
                  
                  <div className="text-[11px] text-text-muted text-center mt-3">
                    Data diperbarui: {currentDateStr}
                  </div>
                </>
              )}
            </div>

            {/* Comparison card (before vs after recommendation) if stateData exists */}
            {stateData && (
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm bg-gradient-to-tr from-[#1a146b]/5 to-transparent relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 text-primary relative z-10">
                  <span className="material-symbols-outlined text-[20px] font-bold">compare_arrows</span>
                  <h3 className="font-bold text-[13.5px] text-[#1a146b]">Perbandingan Skenario ({stateData.nama_pemda})</h3>
                </div>
                
                <p className="text-[12px] text-text-muted mb-4 leading-relaxed relative z-10">
                  Perbandingan performa indikator makro dan rasio alokasi belanja daerah sebelum dan sesudah rekomendasi dijalankan.
                </p>

                <div className="flex flex-col gap-3 relative z-10">
                  {/* Indikator Makro Sebelum vs Sesudah */}
                  <div className="bg-slate-50/80 rounded-lg p-3 border border-border-subtle">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Estimasi Indikator Makro</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] text-text-muted font-semibold">IPM Pembangunan</div>
                        <div className="text-body-sm font-bold text-text-main flex items-baseline gap-1 mt-1">
                          <span>{stateData.initialCtx.ipm_lag1.toFixed(2)}</span>
                          <span className="text-text-muted text-[11px]">→</span>
                          <span className="text-emerald-600 font-extrabold">
                            {result ? result.prediksi_ipm.toFixed(2) : "..."}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-text-muted font-semibold">Tingkat Kemiskinan</div>
                        <div className="text-body-sm font-bold text-text-main flex items-baseline gap-1 mt-1">
                          <span>{stateData.initialCtx.kemiskinan_lag1.toFixed(2)}%</span>
                          <span className="text-text-muted text-[11px]">→</span>
                          <span className="text-rose-600 font-extrabold">
                            {result ? result.prediksi_kemiskinan.toFixed(2) : "..."}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Perbandingan Rincian Rasio Anggaran */}
                  <div className="bg-slate-50/80 rounded-lg p-3 border border-border-subtle">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Perbandingan Rasio Belanja</div>
                    <div className="flex flex-col gap-2">
                      {SEKTORS.map(({ key, label }) => {
                        const act = stateData.initialRasio[key] ?? 0;
                        const cur = rasio[key] ?? 0;
                        const diff = cur - act;
                        return (
                          <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-text-muted font-semibold text-[11px]">{label}</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-text-muted font-medium">{act.toFixed(1)}%</span>
                              <span className="text-[10px] text-text-muted font-normal">→</span>
                              <span className="text-text-main">{cur.toFixed(1)}%</span>
                              {diff !== 0 && (
                                <span className={`text-[10px] ${diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  ({diff > 0 ? "+" : ""}{diff.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supplemental Chart Card */}
            {result && (
              <div className="bg-surface-white border border-border-subtle p-component-padding rounded-lg shadow-sm">
                <div className="font-bold text-[13.5px] text-text-main mb-3">Dampak Visualisasi Tingkat Level</div>
                <BarChart height={140} suffix="" showVal data={[
                  { label: "IPM Awal",        value: ctx.ipm_lag1,              color: "#cbd5e1" },
                  { label: "IPM Prediksi",     value: result.prediksi_ipm,       color: "var(--emerald)" },
                  { label: "Kmskn Awal",       value: ctx.kemiskinan_lag1,       color: "#cbd5e1" },
                  { label: "Kmskn Prediksi",   value: result.prediksi_kemiskinan, color: "var(--rose)" },
                ]} />
                <button 
                  className="btn w-full justify-center mt-4 h-[38px] text-[12.5px] font-semibold" 
                  onClick={() => navigate("/perbandingan")}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">compare</span>
                  Bandingkan dengan Data Historis
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

