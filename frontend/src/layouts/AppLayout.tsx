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
    <div className="min-h-screen rc-bg rc-text transition-colors">
      <div className="flex">
        <Sidebar />

        <main className="flex-1 min-w-0">
          <Topbar title={sectionTitle} />
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <AssistantWidget />

      <footer className="px-4 py-3 text-xs rc-muted border-t rc-border">
        <div className="max-w-7xl mx-auto">
          © {new Date().getFullYear()} Real Connect —{" "}
          <Link to="/app" className="underline hover:no-underline rc-text">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
