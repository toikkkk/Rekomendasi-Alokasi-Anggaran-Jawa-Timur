import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import DetailDaerah from "./pages/DetailDaerah";
import Rekomendasi from "./pages/Rekomendasi";
import Simulasi from "./pages/Simulasi";
import Perbandingan from "./pages/Perbandingan";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="app-shell">
        <Navbar />
        <div className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/daerah/:nama" element={<DetailDaerah />} />
            <Route path="/rekomendasi" element={<Rekomendasi />} />
            <Route path="/simulasi" element={<Simulasi />} />
            <Route path="/perbandingan" element={<Perbandingan />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
