import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Contact,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
} from "lucide-react";
import clsx from "clsx";
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
  { to: "/app/avisos", label: "Recordatorios y avisos", icon: Bell }, // 👈 nuevo
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("rc_sidebar_collapsed", false);
  const width = collapsed ? "w-[76px]" : "w-64";

  return (
    <aside
      className={clsx(
        "h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950",
        "transition-all duration-300 ease-in-out hidden md:flex flex-col",
        width
      )}
    >
      <div className="flex items-center gap-3 px-3 py-4 border-b border-gray-200 dark:border-gray-800">
        <img src="/logo.png" alt="Real Connect" className="h-8 w-8 rounded" />
        {!collapsed && (
          <div className="font-semibold leading-tight">
            <div className="text-sm">Real Connect</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">CRM Inmobiliario</div>
          </div>
        )}
        <button
          className="ml-auto inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 h-8 w-8"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

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
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white",
                  isActive &&
                    "bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-800"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-3 text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
<<<<<<< HEAD
        {collapsed ? "Version beta" : "Innovasoft"}
=======
        {collapsed ? "v0.1" : "v0.1 • Dev"}
>>>>>>> parent of 0870ace (Cambiar tema claro y oscuro)
      </div>
    </aside>
  );
}
