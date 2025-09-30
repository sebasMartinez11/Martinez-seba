import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function AppLayout() {
  const { pathname } = useLocation();

  const sectionTitle = useMemo(() => {
    if (pathname.startsWith("/app/leads")) return "Leads";
    if (pathname.startsWith("/app/propiedades")) return "Propiedades";
    if (pathname.startsWith("/app/usuarios")) return "Usuarios";
    if (pathname.startsWith("/app/avisos")) return "Recordatorios y avisos"; // 👈 NUEVO
    if (pathname.startsWith("/app/configuracion")) return "Configuración";   // 👈 opcional
    return "Dashboard";
  }, [pathname]);

  usePageTitle(sectionTitle ? `${sectionTitle} · Real Connect` : "Real Connect");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Topbar title={sectionTitle} />
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          © {new Date().getFullYear()} Real Connect —{" "}
          <Link to="/app" className="underline hover:no-underline">Home</Link>
        </div>
      </footer>
    </div>
  );
}
