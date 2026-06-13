# Design Specification: Rekomendasi Anggaran (APBD Jatim)

This document specifies the design system, page flow, and components of the budget allocation recommendation web app. Provide this file to **Stitch** (`stitch.withgoogle.com`) to align design updates with the codebase.

---

## 1. Tech Stack & Architecture

- **Frontend Core:** React + Vite
- **Styling:** Vanilla CSS styled with premium, responsive glassmorphic/modern patterns in [index.css](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/index.css).
- **Icons:** Inline custom SVGs wrapped in [Icon.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/Icon.jsx).
- **Charts:** Custom Recharts/SVG components in [Charts.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/Charts.jsx).

---

## 2. Color System & Design Tokens

### Colors
- **Backgrounds:**
  - Base: `#f1f5f9` (Slate 100)
  - Surface: `#ffffff`
  - Soft Surface: `#f8fafc` (Slate 50)
- **Primary Accents:**
  - Primary Indigo: `#4f46e5`
  - Primary Dark Indigo: `#4338ca`
  - Primary Lavender Light: `#eef2ff`
- **Gradient Brand:**
  - `linear-gradient(135deg, #4f46e5 0%, #6d28d9 55%, #7c3aed 100%)`
- **Categorical Alerts & Badges:**
  - Emerald (Success/Good): `#059669` (bg: `#ecfdf5`)
  - Amber (Warning/Alert): `#d97706` (bg: `#fffbeb`)
  - Rose (Danger/Negative): `#e11d48` (bg: `#fff1f2`)
  - Sky/Blue (Neutral Info): `#0284c7` (bg: `#eff6ff`)

### Typography
- **Font Face:** `'Inter', system-ui, -apple-system, sans-serif`
- **Monospace Font:** `'IBM Plex Mono', ui-monospace, monospace`
- **Track Spacing:** `-0.011em` for readability

### Spacing & Borders
- **Navbar Height:** `68px`
- **Border Radii:**
  - Small: `8px` (`--r-sm`)
  - Normal: `12px` (`--r`)
  - Large: `18px` (`--r-lg`)
  - Extra Large: `24px` (`--r-xl`)
- **Shadows:**
  - Accent shadow: `0 24px 60px -16px rgba(79,70,229,.45)`
  - Standard Card shadow: `0 4px 12px rgba(15,23,42,.06)`

---

## 3. Page Layouts & Paths

1. **Dashboard (`/`):**
   - Summary statistics cards (Average IPM, Poverty, Regency Count).
   - Interactive district data table with sorting, search, and cluster badges.
2. **Detail Daerah (`/daerah/:nama`):**
   - Historical line charts of budget trends (Barang & Jasa, Modal, Pegawai vs. IPM/Poverty).
3. **Rekomendasi (`/rekomendasi`):**
   - Benchmark comparisons (actual allocation vs. local cluster-specific high-performing median).
   - Priority gap actions listed in priority bars.
4. **Simulasi (`/simulasi`):**
   - Interactive what-if sliders to adjust 6 budget sectors.
   - Live prediction response cards showing expected $\Delta$ IPM and $\Delta$ Poverty.
5. **Perbandingan (`/perbandingan`):**
   - Historical comparison visualization across all regions.

---

## 4. Component Definitions

- **[Navbar.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/Navbar.jsx):** Sticky, backdrop-filter blur navigation.
- **[PemdaTable.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/PemdaTable.jsx):** Sortable search table for district list.
- **[SimulasiSlider.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/SimulasiSlider.jsx):** Custom HTML5 range inputs with progress fill.
- **[KlasterBadge.jsx](file:///c:/Users/thori/Documents/Semester%204/rekomendasi%20sistem/project/rekomendasi-anggaran/frontend/src/components/KlasterBadge.jsx):** Displays colored badges mapping to K-Means cluster indexes (`c0`, `c1`, `c2`).
