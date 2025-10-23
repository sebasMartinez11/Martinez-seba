import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Contact,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  LogOut, 
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

const items: Item[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/leads", label: "Leads", icon: Contact },
  { to: "/app/propiedades", label: "Propiedades", icon: Building2 },
  { to: "/app/avisos", label: "Recordatorios y avisos", icon: Bell },
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("rc_sidebar_collapsed", false);
  const [userName, setUserName] = useState<string | null>(null);
  const navigate = useNavigate();

  const width = collapsed ? "w-[76px]" : "w-64";

  useEffect(() => {
    // lee (si existe) el nombre guardado
    const stored = localStorage.getItem("rc_user_name");
    setUserName(stored);
  }, []);

  const handleLogout = () => {
    // limpia credenciales/session
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
    localStorage.removeItem("rc_user_name");
    navigate("/");
  };

  return (
    <aside
      className={clsx(
        "h-screen sticky top-0 border-r border-soft dark:border-soft bg-app dark:bg-gray-950",
        "transition-all duration-300 ease-in-out hidden md:flex flex-col",
        width
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-soft dark:border-soft">
        <img src="/logo.png" alt="Real Connect" className="h-8 w-8 rounded" />
        {!collapsed && (
          <div className="font-semibold leading-tight">
            <div className="text-sm">Real Connect</div>
            <div className="text-[10px] text-muted-clr dark:text-gray-400">CRM Inmobiliario</div>
          </div>
        )}
        <button
          className="ml-auto inline-flex items-center justify-center rounded-md border border-soft dark:border-soft hover:bg-app dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 h-8 w-8"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                  // Normal
                  "text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] hover:text-[color:var(--primary)]",
                  "dark:text-[color:var(--text-muted)] dark:hover:bg-[color:var(--surface-2)] dark:hover:text-[color:var(--text-strong)]",
                  // Activo
                  isActive &&
                    "bg-[color:var(--primary)] text-white dark:bg-[color:var(--primary)] dark:text-white shadow-sm"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Pie: Cerrar sesión + versión */}
      <div className="mt-auto border-t border-soft dark:border-soft">
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
              "hover:bg-[color:var(--surface-2)] text-[color:var(--text)] dark:text-[color:var(--text-strong)]",
              "transition-colors"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>

          {!collapsed && userName && (
            <p className="mt-2 text-[11px] text-muted-clr dark:text-gray-400">
              Sesión iniciada como <strong>{userName}</strong>
            </p>
          )}
        </div>

        <div className="px-3 pb-3 text-[10px] text-muted-clr dark:text-gray-400">
          {collapsed ? "v0.1" : "v0.1 • Dev"}
        </div>
      </div>
    </aside>
  );
}
