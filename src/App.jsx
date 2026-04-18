import { Routes, Route, Navigate } from "react-router-dom";
import OggiView from "./components/oggi/OggiView.jsx";
import ConfigView from "./components/config/ConfigView.jsx";
import NavBar from "./components/shared/NavBar.jsx";

// Shell with bottom nav and route outlets.
// Only Oggi and Config are implemented in Fase 2; Log and Export stub to redirect.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/oggi" replace />} />
        <Route path="/oggi" element={<OggiView />} />
        <Route path="/config/*" element={<ConfigView />} />
        <Route path="/log" element={<Placeholder title="Log" />} />
        <Route path="/export" element={<Placeholder title="Export" />} />
        <Route path="*" element={<Navigate to="/oggi" replace />} />
      </Routes>
      <NavBar />
    </>
  );
}

function Placeholder({ title }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm opacity-70">Non ancora implementato in questa fase.</p>
      </div>
    </div>
  );
}
