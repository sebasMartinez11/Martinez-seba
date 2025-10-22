import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import AssistantWidget from "@/components/AssistantWidget";

export default function AppLayout() {
  const { pathname } = useLocation();

  const sectionTitle = useMemo(() => {
    if (pathname.startsWith("/app/leads")) return "Leads";
    if (pathname.startsWith("/app/propiedades")) return "Propiedades";
    if (pathname.startsWith("/app/usuarios")) return "Usuarios";
    if (pathname.startsWith("/app/avisos")) return "Recordatorios y avisos";
    if (pathname.startsWith("/app/configuracion")) return "Configuración";
    return "Dashboard";
  }, [pathname]);

  usePageTitle(sectionTitle ? `${sectionTitle} · Real Connect` : "Real Connect");

  return (
    <div className="min-h-screen bg-app text-base-clr relative z-0">
      <div className="flex">
        <Sidebar />

        {/* Columna principal */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar con superficie y borde suaves (se adapta a ambos temas) */}
          <header className="bg-surface border-b border-soft sticky top-0 z-50 shadow-elev-1">
            <Topbar title={sectionTitle} />
          </header>

          {/* Contenido */}
          <main className="flex-1 bg-app">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>

          {/* Footer coherente */}
          <footer className="px-4 py-3 text-xs text-muted-clr border-t border-soft bg-surface-2">
            <div className="max-w-7xl mx-auto">
              © {new Date().getFullYear()} Real Connect —{" "}
              <Link to="/app" className="underline hover:no-underline">Home</Link>
            </div>
          </footer>
        </div>
      </div>

      {/* Asistente visible en /app */}
      <AssistantWidget />
    </div>
  );
}
