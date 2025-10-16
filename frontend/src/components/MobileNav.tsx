import { NavLink } from "react-router-dom";
import { LayoutDashboard, Contact, Building2, Users } from "lucide-react";
import clsx from "clsx";

/**
 * Barra de navegación inferior para mobile (<md).
 * Usa las mismas rutas que el Sidebar de desktop.
 */
export default function MobileNav() {
  const items = [
    { to: "/app", label: "Inicio", icon: LayoutDashboard, end: true },
    { to: "/app/leads", label: "Leads", icon: Contact, end: false },
    { to: "/app/propiedades", label: "Props", icon: Building2, end: false },
    { to: "/app/usuarios", label: "Usuarios", icon: Users, end: false },
  ] as const;

  return (
    <nav
      className={clsx(
        "fixed bottom-0 inset-x-0 z-50 md:hidden",
        "border-t border-gray-200 dark:border-gray-800",
        "bg-white/95 dark:bg-gray-950/95 backdrop-blur"
      )}
      style={{
        paddingBottom:
          "calc(env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Navegación inferior"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end as boolean | undefined}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center justify-center gap-1 py-2.5",
                  "text-xs select-none",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300"
                )
              }
              aria-label={label}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
