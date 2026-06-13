import { NavLink, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/rekomendasi", label: "Rekomendasi" },
  { to: "/simulasi", label: "Simulasi" },
  { to: "/perbandingan", label: "Perbandingan" },
];

export default function Navbar() {
  const navigate = useNavigate();
  return (
    <header className="bg-surface-white border-b border-border-subtle sticky top-0 z-50 flex justify-between items-center w-full px-page-margin h-16">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <span className="material-symbols-outlined text-primary text-[24px]">account_balance</span>
        <span className="font-headline-md text-headline-md font-bold text-primary">APBD Jatim</span>
      </div>
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex gap-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `transition-colors px-3 py-1 rounded text-body-sm font-semibold ${
                  isActive
                    ? "text-primary bg-surface-container-low"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button 
          className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
          onClick={() => navigate("/simulasi")}
        >
          settings
        </button>
      </div>
    </header>
  );
}

