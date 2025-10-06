import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";

import Landing from "./pages/Landing"; // si tu carpeta es /pages/landing/, también podés usar "./pages/landing"
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

import DashboardPage from "./pages/Dashboard";
import LeadsPage from "./pages/Leads";
import PropiedadesPage from "./pages/Propiedades";
import UsuariosPage from "./pages/Usuarios";
import ConfiguracionPage from "./pages/Configuracion";
import AvisosPage from "./pages/Avisos"; // 👈 NUEVO

export default function App() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* App autenticada (placeholder, sin guard por ahora) */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="propiedades" element={<PropiedadesPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="avisos" element={<AvisosPage />} /> {/* 👈 NUEVA RUTA */}
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
