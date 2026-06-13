import { useState, useRef, useEffect } from "react";

export function CountUp({ value, decimals = 0, dur = 900 }) {
  const [v, setV] = useState(0);
  const ref = useRef();
  useEffect(() => {
    let raf, start;
    const from = ref.current ?? 0, to = value;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      setV(from + (to - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else ref.current = to;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{v.toFixed(decimals)}</span>;
}

const KLASTER_LABELS = { 0: "Kota Maju", 1: "Metropolitan", 2: "Berkembang" };

export function KlasterBadge({ klaster, lg }) {
  const label = KLASTER_LABELS[klaster] ?? `Klaster ${klaster}`;
  return (
    <span className={`badge c${klaster} ${lg ? "lg" : ""}`}>
      <span className="bdot" />
      {label}
    </span>
  );
}

export function Skel({ w, h, r, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r || 8, ...style }} />;
}

export function SkeletonTable({ rows = 8 }) {
  return (
    <div className="anim-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row" style={{ gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
          <Skel w="30px" h="30px" r={8} />
          <Skel w={`${120 + (i % 3) * 40}px`} h="14px" />
          <div style={{ flex: 1 }} />
          <Skel w="60px" h="14px" />
          <Skel w="60px" h="14px" />
          <Skel w="90px" h="14px" />
        </div>
      ))}
    </div>
  );
}

export function useLoad(ms = 650) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, []);
  return loading;
}
