import { useLocation, Link } from "react-router-dom";
import { Sun, Moon, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import clsx from "clsx";

type Props = { title: string };

function useBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", to: "/" }];

  if (parts[0] && parts[0] !== "") {
    const base = "/" + parts[0];
    crumbs.push({ label: capitalize(parts[0]), to: base });
  }
  if (parts[1]) {
    crumbs.push({ label: parts[1], to: pathname });
  }
  return crumbs;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Topbar({ title }: Props) {
  const { pathname } = useLocation();
  const crumbs = useBreadcrumbs(pathname);

  const [theme, setTheme] = useLocalStorage<"light" | "dark">("rc_theme", "light");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const cta = useMemo(() => {
    if (pathname.startsWith("/leads")) return { label: "Nuevo Lead", onClick: () => alert("TODO: Nuevo Lead") };
    if (pathname.startsWith("/propiedades"))
      return { label: "Nueva Propiedad", onClick: () => alert("TODO: Nueva Propiedad") };
    return null;
  }, [pathname]);

  return (
    <div className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {crumbs.map((c, i) => (
                <span key={c.to} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="opacity-50">/</span>}
                  <Link to={c.to} className="hover:underline truncate">
                    {c.label}
                  </Link>
                </span>
              ))}
            </div>
            <h1 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 px-2 h-9">
              <Search className="h-4 w-4 opacity-60" />
              <input
                placeholder="Buscar…"
                className="bg-transparent outline-none text-sm w-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter") alert("TODO: ejecutar búsqueda");
                }}
              />
            </div>

            {cta && (
              <button
                onClick={cta.onClick}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-md px-3 h-9 text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <Plus className="h-4 w-4" />
                {cta.label}
              </button>
            )}

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-800 h-9 w-9"
              title="Cambiar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="ml-1 h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
