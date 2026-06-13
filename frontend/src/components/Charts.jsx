import { useState, useRef, useEffect, useMemo } from "react";

export function LineChart({ series, xLabels, height = 230 }) {
  const W = 720, H = height, padL = 8, padR = 8, padT = 22, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = xLabels.length;
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const scaled = useMemo(() => series.map((s) => {
    const ys = s.data;
    const min = Math.min(...ys), max = Math.max(...ys);
    const pad = (max - min) * 0.25 || 1;
    const lo = min - pad, hi = max + pad;
    const pts = ys.map((y, i) => {
      const x = padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
      const yy = padT + plotH - ((y - lo) / (hi - lo)) * plotH;
      return { x, y: yy, v: y };
    });
    return { ...s, pts };
  }), [series, n]);

  const linePath = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = (pts) => `${linePath(pts)} L${pts[pts.length - 1].x} ${padT + plotH} L${pts[0].x} ${padT + plotH} Z`;

  function onMove(e) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(((rx - padL) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  const tipX = hover != null ? (padL + (n === 1 ? plotW / 2 : (hover / (n - 1)) * plotW)) / W * 100 : 0;
  const len = 1400;

  return (
    <div ref={wrapRef} style={{ position: "relative" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <defs>
          {scaled.map((s, i) => (
            <linearGradient key={i} id={`lg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, .25, .5, .75, 1].map((g, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + g * plotH} y2={padT + g * plotH} stroke="#eef2f6" strokeWidth="1" />
        ))}
        {xLabels.map((lb, i) => (
          <text key={i} x={padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)} y={H - 10} fontSize="12" fill="#94a3b8" textAnchor="middle" fontWeight="600">{lb}</text>
        ))}
        {scaled.map((s, i) => (
          <g key={i}>
            <path d={areaPath(s.pts)} fill={`url(#lg-${i})`} className="anim-in" />
            <path d={linePath(s.pts)} fill="none" stroke={s.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="dashpath" style={{ "--len": len }} />
            {s.pts.map((p, j) => (
              <circle key={j} cx={p.x} cy={p.y} r={hover === j ? 5 : 3.4} fill="#fff" stroke={s.color} strokeWidth="2.4" style={{ transition: "r .12s" }} />
            ))}
          </g>
        ))}
        {hover != null && (
          <line x1={padL + (n === 1 ? plotW / 2 : (hover / (n - 1)) * plotW)} x2={padL + (n === 1 ? plotW / 2 : (hover / (n - 1)) * plotW)} y1={padT} y2={padT + plotH} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip show" style={{ left: `${tipX}%`, top: 40 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{xLabels[hover]}</div>
          {scaled.map((s, i) => (
            <div className="tip-row" key={i}>
              <span className="tip-sw" style={{ background: s.color }} />
              {s.label}: <b style={{ marginLeft: 2 }}>{s.fmt ? s.fmt(s.pts[hover].v) : s.pts[hover].v}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, height = 220, color = "var(--primary)", suffix = "%", showVal = true }) {
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const [hover, setHover] = useState(null);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", justifyContent: "center", position: "relative" }}>
              {showVal && (
                <div style={{ position: "absolute", top: `calc(${100 - h}% - 24px)`, fontSize: 13, fontWeight: 750, color: "var(--text)", fontVariantNumeric: "tabular-nums", transition: "opacity .2s", opacity: hover === i ? 1 : .85 }}>
                  {d.value}{suffix}
                </div>
              )}
              <div className="bar-grow" style={{ width: "72%", maxWidth: 64, height: `${h}%`, background: d.color || color, borderRadius: "8px 8px 4px 4px", animationDelay: `${i * 0.07}s`, boxShadow: hover === i ? "0 8px 20px -6px rgba(79,70,229,.4)" : "none", transition: "box-shadow .2s", minHeight: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: hover === i ? "var(--text)" : "var(--muted)", fontWeight: 600, marginTop: 10, textAlign: "center", lineHeight: 1.2, transition: "color .15s" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AllocationChart({ data }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const [hover, setHover] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 18 }}>
        {data.map((d, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ width: `${(d.value / total) * 100}%`, background: d.color, transition: "filter .15s", filter: hover != null && hover !== i ? "saturate(.5) opacity(.55)" : "none", transformOrigin: "left", animation: `barGrowH .6s ${i * 0.05}s both` }}
            title={`${d.label}: ${d.value.toFixed(1)}%`} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 22px" }}>
        {data.map((d, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 8px", borderRadius: 8, background: hover === i ? "var(--surface-2)" : "transparent", transition: "background .15s" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: d.color, flex: "none" }} />
            <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>{d.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Donut({ value, max = 100, label, color = "var(--primary)", size = 132, suffix = "" }) {
  const r = size / 2 - 12, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 780, letterSpacing: "-.03em" }}>{value}{suffix}</div>
          {label && <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}
