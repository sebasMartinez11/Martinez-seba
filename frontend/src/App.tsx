import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayouts";
import DashboardPage from "./pages/Dashboard";
import LeadsPage from "./pages/Leads";
import PropiedadesPage from "./pages/Propiedades";
import UsuariosPage from "./pages/Usuarios";

export default function App() {
  return (
    <Routes>
      {/* Parent con path="/" para que el layout siempre renderice */}
      <Route path="/" element={<AppLayout />}>
        {/* Ruta índice (equivale a "/") */}
        <Route index element={<DashboardPage />} />
        {/* Hijas sin barra inicial porque heredan de "/" */}
        <Route path="leads" element={<LeadsPage />} />
        <Route path="propiedades" element={<PropiedadesPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
