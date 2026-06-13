const KLASTER_CONFIG = {
  0: {
    badgeClass: "bg-primary-fixed text-on-primary-fixed-variant border border-outline-variant",
    label: "C0",
    desc: "High Growth / High IPM"
  },
  1: {
    badgeClass: "bg-secondary-container text-on-secondary-fixed-variant border border-outline-variant",
    label: "C1",
    desc: "Developing / Emerging"
  },
  2: {
    badgeClass: "bg-secondary-fixed-dim text-on-secondary-fixed border border-outline-variant",
    label: "C2",
    desc: "Priority Support Required"
  }
};

export default function KlasterBadge({ klaster, lg = false }) {
  const config = KLASTER_CONFIG[klaster] ?? {
    badgeClass: "bg-surface-container text-on-surface border border-outline-variant",
    label: `C${klaster}`,
    desc: `Klaster ${klaster}`
  };
  
  if (lg) {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${config.badgeClass}`}>
        {config.label} — {config.desc}
      </span>
    );
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${config.badgeClass}`}>
      {config.label}
    </span>
  );
}

