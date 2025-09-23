import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Building2, Contact, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Contact, badge: undefined },
  { to: "/propiedades", label: "Propiedades", icon: Building2 },
  { to: "/usuarios", label: "Usuarios", icon: Users },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("rc_sidebar_collapsed", false);
  const { pathname } = useLocation();

  const width = collapsed ? "w-[76px]" : "w-64";

  return (
    <aside
      className={clsx(
        "h-screen sticky top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950",
        "transition-all duration-300 ease-in-out hidden md:flex flex-col",
        width
      )}
    >
      {/* Header / Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-gray-200 dark:border-gray-800">
        <img src="/logo.png" alt="Real Connect" className="h-8 w-8 rounded" />
        {!collapsed && (
          <div className="font-semibold leading-tight">
            <div className="text-sm">Real Connect</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">CRM Inmobiliario</div>
          </div>
        )}
        <button
          className={clsx(
            "ml-auto inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-800",
            "hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300",
            "h-8 w-8"
          )}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  "dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white",
                  isActive &&
                    "bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-800"
                )
              }
              end={it.to === "/"}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{it.label}</span>
                  {typeof it.badge !== "undefined" && (
                    <span className="ml-auto inline-flex items-center rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px]">
                      {it.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer mini */}
      <div className="px-3 py-3 text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        {!collapsed ? "v0.1 • Dev" : "v0.1"}
      </div>
    </aside>
  );
}
